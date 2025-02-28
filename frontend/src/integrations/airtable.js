// /frontend/src/integrations/airtable.js
import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import axios from 'axios';

export const AirtableIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectClick = async () => {
    try {
      setIsConnecting(true);
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      const response = await axios.post(`http://localhost:8000/integrations/airtable/authorize`, formData);
      const authURL = response?.data;

      const newWindow = window.open(authURL, 'Airtable Authorization', 'width=600,height=600');
      const pollTimer = window.setInterval(() => {
        if (newWindow?.closed) {
          window.clearInterval(pollTimer);
          handleWindowClosed();
        }
      }, 200);
    } catch (e) {
      setIsConnecting(false);
      alert(e?.response?.data?.detail);
    }
  };

  const handleWindowClosed = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      const response = await axios.post(`http://localhost:8000/integrations/airtable/credentials`, formData);
      const credentials = response.data;
      if (credentials) {
        setIsConnecting(false);
        setIsConnected(true);
        setIntegrationParams((prev) => ({ ...prev, credentials, type: 'Airtable' }));
      }
    } catch (e) {
      setIsConnecting(false);
      alert(e?.response?.data?.detail);
    }
  };

  useEffect(() => {
    setIsConnected(!!integrationParams?.credentials);
  }, [integrationParams]);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="subtitle1" gutterBottom>
        Airtable Integration
      </Typography>
      <Button
        variant="contained"
        onClick={isConnected ? undefined : handleConnectClick}
        color={isConnected ? 'success' : 'primary'}
        disabled={isConnecting || isConnected}
        fullWidth
        sx={{ pointerEvents: isConnected ? 'none' : 'auto' }}
      >
        {isConnected ? 'Airtable Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to Airtable'}
      </Button>
    </Box>
  );
};