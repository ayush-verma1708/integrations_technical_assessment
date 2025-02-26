import { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import axios from 'axios';

const endpointMapping = {
    'Notion': 'notion',
    'Airtable': 'airtable',
    'Hubspot': 'hubspot',  // ✅ Ensure HubSpot is included
};

export const DataForm = ({ integrationType, credentials }) => {
    const [loadedData, setLoadedData] = useState(null);
    
    console.log("Received integrationType:", integrationType);
    console.log("Available endpoints:", endpointMapping);

    const endpoint = endpointMapping[integrationType?.trim()]; // ✅ Trim spaces

    if (!endpoint) {
        console.error(`Unsupported integration type: ${integrationType}`);
        return <Box>Error: Unsupported integration type</Box>;
    }

    const handleLoad = async () => {
        try {
            const response = await axios.post(
                `http://localhost:8000/integrations/${endpoint}/load`,
                { credentials: JSON.stringify(credentials) }, // Ensure credentials are sent as JSON string
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(integrationType === 'HubSpot' && credentials?.access_token
                            ? { Authorization: `Bearer ${credentials.access_token}` } // ✅ Add OAuth token
                            : {}),
                    },
                }
            );

            setLoadedData(response.data);
        } catch (e) {
            console.error(e);
            alert(e?.response?.data?.detail || 'Error loading data');
        }
    };

    return (
        <Box display='flex' justifyContent='center' alignItems='center' flexDirection='column' width='100%'>
            <Box display='flex' flexDirection='column' width='100%'>
                <TextField
                    label="Loaded Data"
                    value={loadedData ? JSON.stringify(loadedData, null, 2) : ''}
                    sx={{ mt: 2 }}
                    InputLabelProps={{ shrink: true }}
                    multiline
                    rows={4}
                    disabled
                />
                <Button onClick={handleLoad} sx={{ mt: 2 }} variant='contained'>
                    Load Data
                </Button>
                <Button
                    onClick={() => setLoadedData(null)}
                    sx={{ mt: 1 }}
                    variant='contained'
                    disabled={!loadedData}
                >
                    Clear Data
                </Button>
            </Box>
        </Box>
    );
};
