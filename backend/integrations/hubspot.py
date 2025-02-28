import secrets
import json
import base64
import hashlib
import aiohttp
import datetime
import asyncio
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import requests
from typing import List, Optional
from dotenv import load_dotenv
import os
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis
from .integration_item import IntegrationItem

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

def create_integration_item(contact_data) -> IntegrationItem:
    """Convert HubSpot contact data to IntegrationItem."""
    properties = contact_data.get("properties", {})
    
    # Get name components, providing fallbacks
    first_name = properties.get("firstname", "")
    last_name = properties.get("lastname", "")
    full_name = f"{first_name} {last_name}".strip() or "Unnamed Contact"
    
    # Handle timestamps
    created_at = contact_data.get("createdAt")
    updated_at = contact_data.get("updatedAt")
    
    if created_at:
        creation_time = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    else:
        creation_time = None
        
    if updated_at:
        last_modified_time = datetime.datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    else:
        last_modified_time = None
    
    return IntegrationItem(
        id=contact_data.get("id"),
        type="contact",
        name=full_name,
        creation_time=creation_time,
        last_modified_time=last_modified_time,
        parent_id=None,
        url=f"https://app.hubspot.com/contacts/{contact_data.get('id')}",
        visibility=True
    )

async def get_items_hubspot(credentials) -> dict:
    """Fetch and process HubSpot contacts data."""
    try:
        # Parse credentials
        if isinstance(credentials, str):
            credentials_data = json.loads(credentials)
        else:
            credentials_data = credentials
        
        access_token = credentials_data.get("access_token")
        if not access_token:
            return {"error": "Invalid credentials format: missing access token"}
        
        # Fetch contacts from HubSpot API
        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        params = {
            "limit": 100,
            "properties": "firstname,lastname,email,phone,company,website"
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code != 200:
            return {"error": f"Failed to fetch contacts: {response.status_code} - {response.text}"}
        
        # Process the response data
        data = response.json()
        contacts = data.get("results", [])
        
        # Convert each contact to IntegrationItem
        integration_items = [create_integration_item(contact) for contact in contacts]
        
        # Return processed data
        return {
            "items": [item.__dict__ for item in integration_items],
            "count": len(integration_items)
        }
        
    except Exception as e:
        return {"error": f"Failed to process HubSpot data: {str(e)}"}

async def refresh_hubspot_access_token(org_id, user_id):
    """Refresh HubSpot access token using refresh_token."""
    # Get stored credentials
    credentials = await get_value_redis(f"hubspot_credentials:{org_id}:{user_id}")
    
    if not credentials:
        raise HTTPException(status_code=400, detail="No credentials found")
    
    credentials_json = json.loads(credentials)
    refresh_token = credentials_json.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token available")

    # Call HubSpot API to refresh access token
    url = "https://api.hubapi.com/oauth/v1/token"
    payload = {
        "grant_type": "refresh_token",
        "client_id": HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "refresh_token": refresh_token
    }
    
    response = requests.post(url, data=payload)
    
    if response.status_code == 200:
        new_tokens = response.json()

        # Save new access_token and refresh_token
        new_credentials = {
            "access_token": new_tokens["access_token"],
            "refresh_token": new_tokens.get("refresh_token", refresh_token),  # Keep old refresh_token if new one isn't provided
            "token_type": new_tokens["token_type"],
            "expires_in": new_tokens["expires_in"]
        }

        await add_key_value_redis(f"hubspot_credentials:{org_id}:{user_id}", json.dumps(new_credentials), expire=3600)

        return new_credentials
    else:
        raise HTTPException(status_code=400, detail=f"Failed to refresh token: {response.text}")



# import secrets
# import json
# import base64
# import hashlib
# import aiohttp
# import datetime
# import asyncio
# from fastapi import Request, HTTPException
# from fastapi.responses import HTMLResponse
# from redis_client import add_key_value_redis, get_value_redis, delete_key_redis
# from .integration_item import IntegrationItem  # Adjust import based on actual location
# import requests

# from dotenv import load_dotenv
# import os

# load_dotenv()

# # Replace with your actual HubSpot app credentials
# HUBSPOT_CLIENT_ID = os.getenv("HUBSPOT_CLIENT_ID")
# HUBSPOT_CLIENT_SECRET = os.getenv("HUBSPOT_CLIENT_SECRET")
# HUBSPOT_REDIRECT_URI = "http://localhost:8000/integrations/hubspot/oauth2callback"

# HUBSPOT_SCOPE = "crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.deals.write crm.schemas.contacts.read crm.schemas.deals.read oauth"
# HUBSPOT_AUTH_URL = f"https://app.hubspot.com/oauth/authorize?client_id={HUBSPOT_CLIENT_ID}&redirect_uri={HUBSPOT_REDIRECT_URI}&scope={HUBSPOT_SCOPE}&response_type=code"



# encoded_client_id_secret = base64.b64encode(f"{HUBSPOT_CLIENT_ID}:{HUBSPOT_CLIENT_SECRET}".encode()).decode()

# def generate_pkce():
#     """Generate PKCE code verifier and challenge."""
#     code_verifier = secrets.token_urlsafe(32)
#     m = hashlib.sha256()
#     m.update(code_verifier.encode("utf-8"))
#     code_challenge = base64.urlsafe_b64encode(m.digest()).decode("utf-8").replace("=", "")
#     return code_verifier, code_challenge

# async def authorize_hubspot(user_id, org_id):
#     """Generate HubSpot OAuth URL with PKCE and redirect user for authorization."""
#     state_data = {
#         "state": secrets.token_urlsafe(32),
#         "user_id": user_id,
#         "org_id": org_id
#     }
#     encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode("utf-8")).decode("utf-8")

#     code_verifier, code_challenge = generate_pkce()

#     auth_url = (
#         f"{HUBSPOT_AUTH_URL}&"
#         f"state={encoded_state}&"
#         f"code_challenge={code_challenge}&"
#         f"code_challenge_method=S256&"
#         f"scope={HUBSPOT_SCOPE}"
#     )
#     print(f"Generated HubSpot Auth URL: {auth_url}")  # Debug

#     await asyncio.gather(
#         add_key_value_redis(f"hubspot_state:{org_id}:{user_id}", json.dumps(state_data), expire=600),
#         add_key_value_redis(f"hubspot_verifier:{org_id}:{user_id}", code_verifier, expire=600),
#     )

#     return {"auth_url": auth_url}
# async def oauth2callback_hubspot(request: Request):
#     """Handle OAuth callback from HubSpot and store access token."""
#     if request.query_params.get("error"):
#         raise HTTPException(status_code=400, detail=request.query_params.get("error_description"))

#     code = request.query_params.get("code")
#     encoded_state = request.query_params.get("state")
#     if not code or not encoded_state:
#         raise HTTPException(status_code=400, detail="Missing code or state")

#     state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode("utf-8"))
#     original_state = state_data.get("state")
#     user_id = state_data.get("user_id")
#     org_id = state_data.get("org_id")

#     saved_state, code_verifier = await asyncio.gather(
#         get_value_redis(f"hubspot_state:{org_id}:{user_id}"),
#         get_value_redis(f"hubspot_verifier:{org_id}:{user_id}"),
#     )

#     if not saved_state or original_state != json.loads(saved_state).get("state"):
#         raise HTTPException(status_code=400, detail="State does not match")

#     token_url = "https://api.hubapi.com/oauth/v1/token"
#     payload = {
#         "grant_type": "authorization_code",
#         "client_id": HUBSPOT_CLIENT_ID,
#         "client_secret": HUBSPOT_CLIENT_SECRET,
#         "redirect_uri": HUBSPOT_REDIRECT_URI,
#         "code": code,
#         "code_verifier": code_verifier.decode("utf-8"),
#     }

#     async with aiohttp.ClientSession() as session:
#         async with session.post(
#             token_url,
#             data=payload,
#             headers={"Content-Type": "application/x-www-form-urlencoded"}
#         ) as resp:
#             if resp.status != 200:
#                 error_detail = await resp.text()
#                 raise HTTPException(status_code=resp.status, detail=f"Failed to get token: {error_detail}")
#             token_data = await resp.json()

#     if not token_data.get("access_token"):
#         raise HTTPException(status_code=500, detail="No access token received from HubSpot")

#     await asyncio.gather(
#         add_key_value_redis(
#             f"hubspot_credentials:{org_id}:{user_id}",
#             json.dumps(token_data),
#             expire=token_data.get("expires_in", 3600)
#         ),
#         delete_key_redis(f"hubspot_state:{org_id}:{user_id}"),
#         delete_key_redis(f"hubspot_verifier:{org_id}:{user_id}"),
#     )

#     close_window_script = """
#     <html>
#         <script>
#             window.close();
#         </script>
#     </html>
#     """
#     return HTMLResponse(content=close_window_script)

# async def get_hubspot_credentials(user_id, org_id):
#     """Retrieve stored HubSpot credentials."""
#     credentials = await get_value_redis(f"hubspot_credentials:{org_id}:{user_id}")
#     if not credentials:
#         raise HTTPException(status_code=400, detail="No credentials found")
#     credentials = json.loads(credentials)
#     await delete_key_redis(f"hubspot_credentials:{org_id}:{user_id}")
#     return credentials

# def create_integration_item_metadata_object(contact_json) -> IntegrationItem:
#     """Parse a single contact JSON and create an IntegrationItem."""
#     return IntegrationItem(
#         id=contact_json["id"],
#         type="contact",
#         name=f"{contact_json['properties'].get('firstname', '')} {contact_json['properties'].get('lastname', '')}".strip() or "Unnamed Contact",
#         creation_time=datetime.fromisoformat(contact_json.get("createdAt").replace("Z", "+00:00")) if contact_json.get("createdAt") else None,
#         last_modified_time=datetime.fromisoformat(contact_json.get("updatedAt").replace("Z", "+00:00")) if contact_json.get("updatedAt") else None,
#         parent_id=None,
#     )


# async def get_items_hubspot(access_token):
#     if not access_token:
#         return {"error": "Missing access token"}

#     url = "https://api.hubapi.com/crm/v3/objects/contacts"
#     headers = {
#         "Authorization": f"Bearer {access_token}",
#     }
#     print(f"Token: {access_token}")
#     print(f"Headers: {headers}")

#     response = requests.get(url, headers=headers)
#     if response.status_code != 200:
#         return {"error": f"Failed to fetch contacts: {response.status_code}"}

#     data = response.json()
#     print(f"Response data: {data}")

#     return {"contacts": data.get("results", [])}
