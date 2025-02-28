import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { connectToService } from './oauthUtils';

export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Load credentials from localStorage when the component mounts
    useEffect(() => {
        const savedCredentials = localStorage.getItem(`hubspot_credentials_${org}_${user}`);
        if (savedCredentials) {
            const parsedCredentials = JSON.parse(savedCredentials);
            setIntegrationParams(prev => ({ ...prev, credentials: parsedCredentials }));
            setIsConnected(true);
        }
    }, []);

    const handleConnectClick = async () => {
        await connectToService('hubspot', user, org, setIsConnecting, setIsConnected, setIntegrationParams);
    };

    useEffect(() => {
        if (integrationParams?.credentials) {
            setIsConnected(true);
            // ✅ Save credentials in localStorage for persistence
            localStorage.setItem(`hubspot_credentials_${org}_${user}`, JSON.stringify(integrationParams.credentials));
        }
    }, [integrationParams]);

    return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="h6">HubSpot Integration</Typography>
            
            <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                <Button
                    variant="contained"
                    onClick={isConnected ? () => {} : handleConnectClick}
                    color={isConnected ? 'success' : 'primary'}
                    disabled={isConnecting}
                    style={{
                        pointerEvents: isConnected ? 'none' : 'auto',
                        cursor: isConnected ? 'default' : 'pointer',
                        opacity: isConnected ? 1 : undefined
                    }}
                >
                    {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
                </Button>
            </Box>
            {isConnected && (
    <Button 
        variant="outlined" 
        color="error" 
        sx={{ mt: 2 }} 
        onClick={() => {
            localStorage.removeItem(`hubspot_credentials_${org}_${user}`);
            setIsConnected(false);
            setIntegrationParams({});
        }}
    >
        Disconnect HubSpot
    </Button>
)}


            {/* ✅ Display Integration Details */}
            {isConnected && integrationParams?.credentials && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
                    <Typography variant="subtitle1">Integration Details:</Typography>
                    <pre style={{ textAlign: 'left', backgroundColor: '#f4f4f4', padding: '8px', borderRadius: '5px' }}>
                        {JSON.stringify(integrationParams.credentials, null, 2)}
                    </pre>
                </Box>
            )}
         
        </Box>
    );
};

// import { useState, useEffect } from 'react';
// import { Box, Button, CircularProgress, Typography } from '@mui/material';
// import { connectToService } from './oauthUtils';

// export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
//     const [isConnected, setIsConnected] = useState(false);
//     const [isConnecting, setIsConnecting] = useState(false);

//     const handleConnectClick = () => {
//         connectToService('hubspot', user, org, setIsConnecting, setIsConnected, setIntegrationParams);
//     };

//     useEffect(() => {
//         setIsConnected(!!integrationParams?.credentials);
//     }, [integrationParams]);

//     return (
//         <Box sx={{ mt: 2, textAlign: 'center' }}>
//             <Typography variant="h6">HubSpot Integration</Typography>
            
//             <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
//                 <Button
//                     variant="contained"
//                     onClick={isConnected ? () => {} : handleConnectClick}
//                     color={isConnected ? 'success' : 'primary'}
//                     disabled={isConnecting}
//                     style={{
//                         pointerEvents: isConnected ? 'none' : 'auto',
//                         cursor: isConnected ? 'default' : 'pointer',
//                         opacity: isConnected ? 1 : undefined
//                     }}
//                 >
//                     {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
//                 </Button>
//             </Box>

//             {/* ✅ Display Connection Details */}
//             {isConnected && integrationParams?.credentials && (
//                 <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
//                     <Typography variant="subtitle1">Integration Details:</Typography>
//                     <pre style={{ textAlign: 'left', backgroundColor: '#f4f4f4', padding: '8px', borderRadius: '5px' }}>
//                         {JSON.stringify(integrationParams.credentials, null, 2)}
//                     </pre>
//                 </Box>
//             )}
//         </Box>
//     );
// };

// // // integrations/hubspot.js
// // import { useState, useEffect } from 'react';
// // import { Box, Button, CircularProgress } from '@mui/material';
// // import { connectToService } from './oauthUtils';

// // export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
// //     const [isConnected, setIsConnected] = useState(false);
// //     const [isConnecting, setIsConnecting] = useState(false);

// //     const handleConnectClick = () => {
// //         connectToService('hubspot', user, org, setIsConnecting, setIsConnected, setIntegrationParams);
// //     };

// //     useEffect(() => {
// //         setIsConnected(!!integrationParams?.credentials);
// //     }, [integrationParams]);

// //     return (
// //         <Box sx={{ mt: 2 }}>
// //             Parameters
// //             <Box display="flex" alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
// //                 <Button
// //                     variant="contained"
// //                     onClick={isConnected ? () => {} : handleConnectClick}
// //                     color={isConnected ? 'success' : 'primary'}
// //                     disabled={isConnecting}
// //                     style={{
// //                         pointerEvents: isConnected ? 'none' : 'auto',
// //                         cursor: isConnected ? 'default' : 'pointer',
// //                         opacity: isConnected ? 1 : undefined
// //                     }}
// //                 >
// //                     {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
// //                 </Button>
// //             </Box>
// //         </Box>
// //     );
// // };