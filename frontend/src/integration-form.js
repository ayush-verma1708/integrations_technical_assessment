import { useState } from 'react';
import {
    Box,
    Autocomplete,
    TextField,
    CircularProgress,
    Alert,
    Typography,
    Paper,
    IconButton,
} from '@mui/material';
import { AirtableIntegration } from './integrations/airtable';
import { NotionIntegration } from './integrations/notion';
import { HubSpotIntegration } from './integrations/hubspot'; // Add HubSpot
import { DataForm } from './data-form';

const integrationMapping = {
    'Airtable': AirtableIntegration,
    'Notion': NotionIntegration,
    'HubSpot': HubSpotIntegration, // Add HubSpot to the mapping
};

export const IntegrationForm = () => {
    const [integrationParams, setIntegrationParams] = useState({});
    const [user, setUser] = useState('TestUser');
    const [org, setOrg] = useState('TestOrg');
    const [currType, setCurrType] = useState(null);
    const [loading, setLoading] = useState(false); // Add loading state
    const [error, setError] = useState(null); // Add error state
    const CurrIntegration = integrationMapping[currType];

    // Reset integrationParams when switching integration types
    const handleTypeChange = (e, value) => {
        setCurrType(value);
        setIntegrationParams({}); // Clear params to avoid stale credentials
        setError(null); // Clear any previous errors
    };

    const handleCopyToken = () => {
        navigator.clipboard.writeText(integrationParams.credentials.access_token);
    };


    return (
        <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" sx={{ width: '100%' }}>
            <Box display="flex" flexDirection="column" sx={{ width: 300 }}>
                <TextField
                    label="User"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    sx={{ mt: 2 }}
                    disabled={loading} // Disable during loading
                />
                <TextField
                    label="Organization"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    sx={{ mt: 2 }}
                    disabled={loading}
                />
                <Autocomplete
                    id="integration-type"
                    options={Object.keys(integrationMapping)}
                    sx={{ mt: 2 }}
                    renderInput={(params) => <TextField {...params} label="Integration Type" />}
                    onChange={handleTypeChange}
                    value={currType}
                    disabled={loading}
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ mt: 2 }}>
                    <CircularProgress />
                </Box>
            )}

            {currType && !loading && (
                <Box sx={{ mt: 2 }}>
                    <CurrIntegration
                        user={user}
                        org={org}
                        integrationParams={integrationParams}
                        setIntegrationParams={setIntegrationParams}
                    />
                </Box>
            )}

         
        </Box>
    );
};
