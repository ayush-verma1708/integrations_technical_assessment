// integrations/oauthUtils.js
import axios from 'axios';

export const connectToService = async (service, user, org, setIsConnecting, setIsConnected, setIntegrationParams) => {
    try {
        setIsConnecting(true);
        const formData = new FormData();
        formData.append('user_id', user);
        formData.append('org_id', org);
        const response = await axios.post(`http://localhost:8000/integrations/${service}/authorize`, formData);
        const authURL = response?.data?.auth_url;

        const newWindow = window.open(authURL, `${service} Authorization`, 'width=600, height=600');

        return new Promise((resolve) => {
            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed !== false) {
                    window.clearInterval(pollTimer);
                    resolve();
                }
            }, 200);
        }).then(async () => {
            const credentialsResponse = await axios.post(
                `http://localhost:8000/integrations/${service}/credentials`,
                formData
            );
            const credentials = credentialsResponse.data;
            if (credentials) {
                setIsConnected(true);
                setIntegrationParams(prev => ({ ...prev, credentials, type: service.charAt(0).toUpperCase() + service.slice(1) }));
            }
            setIsConnecting(false);
        });
    } catch (e) {
        setIsConnecting(false);
        alert(e?.response?.data?.detail || `Error connecting to ${service}`);
    }
};