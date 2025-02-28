// /frontend/src/DataForm.js
import { useState, useEffect } from 'react';
import { Box, TextField, Button, Card, CardContent, Typography, Collapse } from '@mui/material';
import axios from 'axios';

const endpointMapping = {
  Notion: 'notion',
  Airtable: 'airtable',
  HubSpot: 'hubspot',
};

export const DataForm = ({
  integrationType,
  credentials,
  setLoading,
  setError,
  loadedData,
  setLoadedData,
  loading, // Add loading prop
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    console.log('Current state - loadedData:', loadedData, 'expanded:', expanded);
  }, [loadedData, expanded]);

  useEffect(() => {
    console.log('DataForm mounted with integrationType:', integrationType);
    return () => console.log('DataForm unmounted');
  }, [integrationType]);

  const endpoint = endpointMapping[integrationType?.trim()];
  if (!endpoint) {
    console.error(`Unsupported integration type: ${integrationType}`);
    return <Typography color="error">Unsupported integration type</Typography>;
  }

  const handleLoad = async () => {
    if (!credentials) {
      setError('No credentials available');
      return;
    }
    setLoading(true);
    setError(null);
    console.log('Sending credentials:', credentials);
    try {
      const response = await axios.post(
        `http://localhost:8000/integrations/${endpoint}/load`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(integrationType === 'HubSpot' && credentials?.access_token
              ? { Authorization: `Bearer ${credentials.access_token}` }
              : {}),
          },
        }
      );
      console.log('Loaded data:', response.data);
      setLoadedData(response.data);
      setExpanded(true);
    } catch (e) {
      console.error('Error loading data:', e);
      setError(e?.response?.data?.detail || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card elevation={2} sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {integrationType} Data
        </Typography>
        <Button
          onClick={handleLoad}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
          disabled={!credentials || loading} // Use loading prop
        >
          Load Data
        </Button>
        {loadedData ? (
          <>
            <Button
              variant="outlined"
              onClick={() => setExpanded(!expanded)}
              fullWidth
              sx={{ mb: 2 }}
            >
              {expanded ? 'Hide' : 'Show'} Loaded Data ({loadedData.count || 0} items)
            </Button>
            <Collapse in={expanded}>
              <TextField
                label="Loaded Data"
                value={loadedData ? JSON.stringify(loadedData, null, 2) : ''}
                fullWidth
                multiline
                rows={6}
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{ mb: 2, bgcolor: '#fafafa' }}
              />
              <Button
                onClick={() => {
                  setLoadedData(null);
                  setExpanded(false);
                }}
                variant="contained"
                color="secondary"
                fullWidth
              >
                Clear Data
              </Button>
            </Collapse>
          </>
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            No data loaded yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};