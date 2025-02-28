import secrets
import json
import base64
import hashlib
import aiohttp
import asyncio
import datetime
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import httpx
from dotenv import load_dotenv
import os
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis
from .integration_item import IntegrationItem
import requests

load_dotenv()

# HubSpot app credentials
HUBSPOT_CLIENT_ID = os.getenv("HUBSPOT_CLIENT_ID")
HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET")
HUBSPOT_REDIRECT_URI = "http://localhost:8000/integrations/hubspot/oauth2callback"
HUBSPOT_SCOPE = "crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write crm.schemas.contacts.read crm.schemas.deals.read oauth"
HUBSPOT_AUTH_URL = f"https://app.hubspot.com/oauth/authorize?client_id={HUBSPOT_CLIENT_ID}&redirect_uri={HUBSPOT_REDIRECT_URI}&scope={HUBSPOT_SCOPE}&response_type=code"

# Base64 encode client ID and secret for Basic Auth
encoded_client_id_secret = base64.b64encode(f"{HUBSPOT_CLIENT_ID}:{HUBSPOT_CLIENT_SECRET}".encode()).decode()

def generate_pkce():
    """Generate PKCE code verifier and challenge."""
    code_verifier = secrets.token_urlsafe(32)
    m = hashlib.sha256()
    m.update(code_verifier.encode("utf-8"))
    code_challenge = base64.urlsafe_b64encode(m.digest()).decode("utf-8").replace("=", "")
    return code_verifier, code_challenge

async def authorize_hubspot(user_id, org_id):
    """Generate HubSpot OAuth URL with PKCE and store state data."""
    state_data = {
        "state": secrets.token_urlsafe(32),
        "user_id": user_id,
        "org_id": org_id
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode("utf-8")).decode("utf-8")
    
    code_verifier, code_challenge = generate_pkce()
    
    auth_url = (
        f"{HUBSPOT_AUTH_URL}&"
        f"state={encoded_state}&"
        f"code_challenge={code_challenge}&"
        f"code_challenge_method=S256"
    )
    
    await asyncio.gather(
        add_key_value_redis(f"hubspot_state:{org_id}:{user_id}", json.dumps(state_data), expire=600),
        add_key_value_redis(f"hubspot_verifier:{org_id}:{user_id}", code_verifier, expire=600),
    )
    
    return {"auth_url": auth_url}

async def oauth2callback_hubspot(request: Request):
    """Handle OAuth callback from HubSpot and store access token."""
    if request.query_params.get("error"):
        raise HTTPException(status_code=400, detail=request.query_params.get("error_description"))
    
    code = request.query_params.get("code")
    encoded_state = request.query_params.get("state")
    
    if not code or not encoded_state:
        raise HTTPException(status_code=400, detail="Missing code or state")
    
    state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode("utf-8"))
    original_state = state_data.get("state")
    user_id = state_data.get("user_id")
    org_id = state_data.get("org_id")
    
    saved_state, code_verifier = await asyncio.gather(
        get_value_redis(f"hubspot_state:{org_id}:{user_id}"),
        get_value_redis(f"hubspot_verifier:{org_id}:{user_id}"),
    )
    
    # if not saved_state or original_state != json.loads(saved_state).get("state"):
    #     raise HTTPException(status_code=400, detail="State does not match")
    
    if not saved_state or state_data["state"] != json.loads(saved_state)["state"]:
        raise HTTPException(status_code=400, detail="State mismatch")

    
    token_url = "https://api.hubapi.com/oauth/v1/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "redirect_uri": HUBSPOT_REDIRECT_URI,
        "code": code,
        "code_verifier": code_verifier.decode("utf-8"),
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            token_url,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        ) as resp:
            if resp.status != 200:
                error_detail = await resp.text()
                raise HTTPException(status_code=resp.status, detail=f"Failed to get token: {error_detail}")
            token_data = await resp.json()
    
    if not token_data.get("access_token"):
        raise HTTPException(status_code=500, detail="No access token received from HubSpot")
    
    # Store the full token data in Redis
    await asyncio.gather(
        add_key_value_redis(
            f"hubspot_credentials:{org_id}:{user_id}",
            json.dumps(token_data),
            expire=token_data.get("expires_in", 3600)
        ),
        delete_key_redis(f"hubspot_state:{org_id}:{user_id}"),
        delete_key_redis(f"hubspot_verifier:{org_id}:{user_id}"),
    )
    
    close_window_script = """
    <html>
        <script>
            window.close();
        </script>
    </html>
    """
    return HTMLResponse(content=close_window_script)

async def get_hubspot_credentials(user_id, org_id):
    """Retrieve stored HubSpot credentials."""
    credentials = await get_value_redis(f"hubspot_credentials:{org_id}:{user_id}")
    if not credentials:
        raise HTTPException(status_code=400, detail="No credentials found")
    
    credentials_json = json.loads(credentials)
    # Delete credentials from Redis after retrieval for security
    await delete_key_redis(f"hubspot_credentials:{org_id}:{user_id}")
    
    return credentials_json


def _recursive_dict_search(data, target_key):
    """Recursively search for a key in a dictionary of dictionaries."""
    if not isinstance(data, dict):
        return None
        
    if target_key in data:
        return data[target_key]
    
    for value in data.values():
        if isinstance(value, dict):
            result = _recursive_dict_search(value, target_key)
            if result is not None:
                return result
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    result = _recursive_dict_search(item, target_key)
                    if result is not None:
                        return result
    return None

def create_integration_item_metadata_object(response_json):
    """Creates an integration metadata object from the HubSpot API response"""
    try:
        # Extract properties
        properties = response_json.get('properties', {})
        
        # Get name components
        first_name = properties.get('firstname', '')
        last_name = properties.get('lastname', '')
        full_name = f"{first_name} {last_name}".strip() or "Unnamed Contact"
        email = properties.get('email', 'No Email')
        
        # Parse timestamps
        created_at = response_json.get('createdAt')
        updated_at = response_json.get('updatedAt')
        
        if created_at:
            try:
                creation_time = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                creation_time = None
        else:
            creation_time = None
            
        if updated_at:
            try:
                last_modified_time = datetime.datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                last_modified_time = None
        else:
            last_modified_time = None
        
        # Create the IntegrationItem
        integration_item = IntegrationItem(
            id=response_json.get('id'),
            type=response_json.get('objectType', 'contact'),
            name=full_name,
            creation_time=creation_time,
            last_modified_time=last_modified_time,
            parent_id=None,  # HubSpot doesn't use parent_id like Notion
            url=f"https://app.hubspot.com/contacts/{properties.get('hs_object_id', '')}" if 'hs_object_id' in properties else None
        )
        
        return integration_item
    except Exception as e:
        print(f"Error creating integration item: {str(e)}")
        # Return a minimal item if there's an error
        return IntegrationItem(
            id=response_json.get('id', 'unknown'),
            type='contact',
            name='Error processing contact'
        )

async def get_items_hubspot(credentials):
    """Fetch HubSpot contacts and deals and convert them to IntegrationItems."""
    try:
        print("Credentials received:", credentials)
        
        # Handle different credential formats
        if isinstance(credentials, str):
            try:
                credentials_dict = json.loads(credentials)
            except json.JSONDecodeError:
                print("Failed to parse credentials as JSON string")
                return {"error": "Invalid credentials format"}
        elif isinstance(credentials, dict):
            credentials_dict = credentials
        else:
            # Check if we're getting a credentials object from Form
            if hasattr(credentials, 'get') and callable(credentials.get):
                if isinstance(credentials.get("credentials"), dict):
                    credentials_dict = credentials.get("credentials")
                else:
                    print("Unexpected credentials format:", credentials)
                    return {"error": "Unsupported credentials format"}
            else:
                print("Unexpected credentials format:", credentials)
                return {"error": "Unsupported credentials format"}
        
        # Extract access token
        access_token = credentials_dict.get("access_token")
        if not access_token:
            print("No access token found in credentials")
            return {"error": "No access token found in credentials"}
        
        print(f"Using access token: {access_token[:10]}...")
        
        # 1. Fetch contacts
        contacts_url = "https://api.hubapi.com/crm/v3/objects/contacts"
        contacts_params = {
            "limit": 50,
            "properties": "firstname,lastname,email,phone,company,website,hs_object_id"
        }
        contacts_headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        print(f"Fetching contacts from {contacts_url}")
        contacts_response = requests.get(contacts_url, params=contacts_params, headers=contacts_headers)
        
        if contacts_response.status_code != 200:
            print(f"Error fetching contacts: {contacts_response.status_code} - {contacts_response.text}")
            return {"error": f"Failed to fetch contacts: {contacts_response.status_code}"}
        
        contacts_data = contacts_response.json()
        contacts_results = contacts_data.get("results", [])
        print(f"Retrieved {len(contacts_results)} contacts")
        
        # 2. Fetch deals
        deals_url = "https://api.hubapi.com/crm/v3/objects/deals"
        deals_params = {
            "limit": 50,
            "properties": "dealname,amount,closedate,dealstage,pipeline"
        }
        
        print(f"Fetching deals from {deals_url}")
        deals_response = requests.get(deals_url, params=deals_params, headers=contacts_headers)
        
        deals_results = []
        if deals_response.status_code == 200:
            deals_data = deals_response.json()
            deals_results = deals_data.get("results", [])
            print(f"Retrieved {len(deals_results)} deals")
        else:
            print(f"Error fetching deals: {deals_response.status_code} - {deals_response.text}")
        
        # 3. Process results into IntegrationItems
        integration_items = []
        
        # Process contacts
        for contact in contacts_results:
            contact["objectType"] = "contact"
            integration_item = create_integration_item_metadata_object(contact)
            integration_items.append(integration_item)
        
        # Process deals
        for deal in deals_results:
            deal["objectType"] = "deal"
            integration_item = create_integration_item_metadata_object(deal)
            integration_items.append(integration_item)
        
        # 4. Convert to dictionaries for JSON serialization
        items_as_dicts = [item.__dict__ for item in integration_items]
        
        # 5. Print results for debugging
        print(f"Total integration items: {len(integration_items)}")
        for item in integration_items[:5]:  # Print first 5 for debugging
            print(f"- {item.type}: {item.name} (ID: {item.id})")
        
        # 6. Return the data
        return {
            "items": items_as_dicts,
            "count": len(items_as_dicts)
        }
        
    except Exception as e:
        print(f"Error in get_items_hubspot: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to process HubSpot data: {str(e)}"}
