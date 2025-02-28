// /frontend/src/IntegrationForm.js
import { useState } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Card,
  CardContent,
  Collapse,
  Button,
} from '@mui/material';
import { AirtableIntegration } from './integrations/airtable';
import { NotionIntegration } from './integrations/notion';
import { HubSpotIntegration } from './integrations/hubspot';
import { DataForm } from './data-form';

const integrationMapping = {
  Airtable: AirtableIntegration,
  Notion: NotionIntegration,
  HubSpot: HubSpotIntegration,
};

export const IntegrationForm = () => {
  const [integrationParams, setIntegrationParams] = useState({});
  const [user, setUser] = useState('TestUser');
  const [org, setOrg] = useState('TestOrg');
  const [currType, setCurrType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [loadedData, setLoadedData] = useState(null);
  const CurrIntegration = currType ? integrationMapping[currType] : null;

  const handleTypeChange = (e, value) => {
    setCurrType(value);
    setIntegrationParams({});
    setError(null);
    setExpanded(true);
    setLoadedData(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Integration Dashboard
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="User"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
            <TextField
              label="Organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
            />
          </Box>

          <Autocomplete
            id="integration-type"
            options={Object.keys(integrationMapping)}
            value={currType}
            onChange={handleTypeChange}
            disabled={loading}
            renderInput={(params) => (
              <TextField {...params} label="Select Integration" size="small" />
            )}
            sx={{ mb: 3 }}
          />

          {loading && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {CurrIntegration && (
            <>
              <Button
                variant="text"
                onClick={() => setExpanded(!expanded)}
                fullWidth
                sx={{ mb: 1, textTransform: 'none' }}
              >
                {expanded ? 'Hide' : 'Show'} {currType} Integration
              </Button>
              <Collapse in={expanded}>
                <Box sx={{ mb: 3 }}>
                  <CurrIntegration
                    user={user}
                    org={org}
                    integrationParams={integrationParams}
                    setIntegrationParams={setIntegrationParams}
                  />
                </Box>
              </Collapse>
            </>
          )}

          {currType && (
            <DataForm
              key={`${currType}-${user}-${org}`}
              integrationType={currType}
              credentials={integrationParams.credentials}
              setLoading={setLoading}
              setError={setError}
              loadedData={loadedData}
              setLoadedData={setLoadedData}
              loading={loading} // Pass loading state
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};


// // /frontend/src/IntegrationForm.js
// import { useState } from 'react';
// import {
//   Box,
//   Autocomplete,
//   TextField,
//   CircularProgress,
//   Alert,
//   Typography,
//   Card,
//   CardContent,
//   Collapse,
//   Button,
// } from '@mui/material';
// import { AirtableIntegration } from './integrations/airtable';
// import { NotionIntegration } from './integrations/notion';
// import { HubSpotIntegration } from './integrations/hubspot';
// import { DataForm } from './data-form';

// const integrationMapping = {
//   Airtable: AirtableIntegration,
//   Notion: NotionIntegration,
//   HubSpot: HubSpotIntegration,
// };

// export const IntegrationForm = () => {
//   const [integrationParams, setIntegrationParams] = useState({});
//   const [user, setUser] = useState('TestUser');
//   const [org, setOrg] = useState('TestOrg');
//   const [currType, setCurrType] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [expanded, setExpanded] = useState(true);
//   const [loadedData, setLoadedData] = useState(null); // Lifted state
//   const CurrIntegration = currType ? integrationMapping[currType] : null;

//   const handleTypeChange = (e, value) => {
//     setCurrType(value);
//     setIntegrationParams({});
//     setError(null);
//     setExpanded(true);
//     setLoadedData(null); // Reset data when switching integrations
//   };

//   return (
//     <Box sx={{ maxWidth: 700, mx: 'auto' }}>
//       <Card elevation={3}>
//         <CardContent>
//           <Typography variant="h5" align="center" gutterBottom>
//             Integration Dashboard
//           </Typography>

//           <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
//             <TextField
//               label="User"
//               value={user}
//               onChange={(e) => setUser(e.target.value)}
//               fullWidth
//               size="small"
//               disabled={loading}
//             />
//             <TextField
//               label="Organization"
//               value={org}
//               onChange={(e) => setOrg(e.target.value)}
//               fullWidth
//               size="small"
//               disabled={loading}
//             />
//           </Box>

//           <Autocomplete
//             id="integration-type"
//             options={Object.keys(integrationMapping)}
//             value={currType}
//             onChange={handleTypeChange}
//             disabled={loading}
//             renderInput={(params) => (
//               <TextField {...params} label="Select Integration" size="small" />
//             )}
//             sx={{ mb: 3 }}
//           />

//           {loading && (
//             <Box sx={{ textAlign: 'center', mb: 2 }}>
//               <CircularProgress size={24} />
//             </Box>
//           )}
//           {error && (
//             <Alert severity="error" sx={{ mb: 2 }}>
//               {error}
//             </Alert>
//           )}

//           {CurrIntegration && (
//             <>
//               <Button
//                 variant="text"
//                 onClick={() => setExpanded(!expanded)}
//                 fullWidth
//                 sx={{ mb: 1, textTransform: 'none' }}
//               >
//                 {expanded ? 'Hide' : 'Show'} {currType} Integration
//               </Button>
//               <Collapse in={expanded}>
//                 <Box sx={{ mb: 3 }}>
//                   <CurrIntegration
//                     user={user}
//                     org={org}
//                     integrationParams={integrationParams}
//                     setIntegrationParams={setIntegrationParams}
//                   />
//                 </Box>
//               </Collapse>
//             </>
//           )}

//           {currType && ( // Always render DataForm when currType is set
//             <DataForm
//               key={`${currType}-${user}-${org}`}
//               integrationType={currType}
//               credentials={integrationParams.credentials}
//               setLoading={setLoading}
//               setError={setError}
//               loadedData={loadedData}
//               setLoadedData={setLoadedData}
//             />
//           )}
//         </CardContent>
//       </Card>
//     </Box>
//   );
// };
// // // /frontend/src/IntegrationForm.js
// // import { useState } from 'react';
// // import {
// //   Box,
// //   Autocomplete,
// //   TextField,
// //   CircularProgress,
// //   Alert,
// //   Typography,
// //   Card,
// //   CardContent,
// //   Collapse,
// //   Button,
// // } from '@mui/material';
// // import { AirtableIntegration } from './integrations/airtable';
// // import { NotionIntegration } from './integrations/notion';
// // import { HubSpotIntegration } from './integrations/hubspot';
// // import { DataForm } from './data-form';

// // const integrationMapping = {
// //   Airtable: AirtableIntegration,
// //   Notion: NotionIntegration,
// //   HubSpot: HubSpotIntegration,
// // };

// // export const IntegrationForm = () => {
// //   const [integrationParams, setIntegrationParams] = useState({});
// //   const [user, setUser] = useState('TestUser');
// //   const [org, setOrg] = useState('TestOrg');
// //   const [currType, setCurrType] = useState(null);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState(null);
// //   const [expanded, setExpanded] = useState(true);
// //   const CurrIntegration = currType ? integrationMapping[currType] : null;

// //   const handleTypeChange = (e, value) => {
// //     setCurrType(value);
// //     setIntegrationParams({});
// //     setError(null);
// //     setExpanded(true);
// //   };

// //   return (
// //     <Box sx={{ maxWidth: 700, mx: 'auto' }}>
// //       <Card elevation={3}>
// //         <CardContent>
// //           <Typography variant="h5" align="center" gutterBottom>
// //             Integration Dashboard
// //           </Typography>

// //           <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
// //             <TextField
// //               label="User"
// //               value={user}
// //               onChange={(e) => setUser(e.target.value)}
// //               fullWidth
// //               size="small"
// //               disabled={loading}
// //             />
// //             <TextField
// //               label="Organization"
// //               value={org}
// //               onChange={(e) => setOrg(e.target.value)}
// //               fullWidth
// //               size="small"
// //               disabled={loading}
// //             />
// //           </Box>

// //           <Autocomplete
// //             id="integration-type"
// //             options={Object.keys(integrationMapping)}
// //             value={currType}
// //             onChange={handleTypeChange}
// //             disabled={loading}
// //             renderInput={(params) => (
// //               <TextField {...params} label="Select Integration" size="small" />
// //             )}
// //             sx={{ mb: 3 }}
// //           />

// //           {loading && (
// //             <Box sx={{ textAlign: 'center', mb: 2 }}>
// //               <CircularProgress size={24} />
// //             </Box>
// //           )}
// //           {error && (
// //             <Alert severity="error" sx={{ mb: 2 }}>
// //               {error}
// //             </Alert>
// //           )}

// //           {CurrIntegration && !loading && (
// //             <>
// //               <Button
// //                 variant="text"
// //                 onClick={() => setExpanded(!expanded)}
// //                 fullWidth
// //                 sx={{ mb: 1, textTransform: 'none' }}
// //               >
// //                 {expanded ? 'Hide' : 'Show'} {currType} Integration
// //               </Button>
// //               <Collapse in={expanded}>
// //                 <Box sx={{ mb: 3 }}>
// //                   <CurrIntegration
// //                     user={user}
// //                     org={org}
// //                     integrationParams={integrationParams}
// //                     setIntegrationParams={setIntegrationParams}
// //                   />
// //                 </Box>
// //               </Collapse>
// //             </>
// //           )}

// //           {integrationParams?.credentials && !loading && (
// //             <DataForm
// //               key={`${currType}-${user}-${org}`} // Stabilize component identity
// //               integrationType={currType}
// //               credentials={integrationParams.credentials}
// //               setLoading={setLoading}
// //               setError={setError}
// //             />
// //           )}
// //         </CardContent>
// //       </Card>
// //     </Box>
// //   );
// // };



// // // // /frontend/src/IntegrationForm.js
// // // import { useState } from 'react';
// // // import {
// // //   Box,
// // //   Autocomplete,
// // //   TextField,
// // //   CircularProgress,
// // //   Alert,
// // //   Typography,
// // //   Card,
// // //   CardContent,
// // //   Collapse,
// // //   Button,
// // // } from '@mui/material';
// // // import { AirtableIntegration } from './integrations/airtable';
// // // import { NotionIntegration } from './integrations/notion';
// // // import { HubSpotIntegration } from './integrations/hubspot';
// // // import { DataForm } from './data-form';

// // // const integrationMapping = {
// // //   Airtable: AirtableIntegration,
// // //   Notion: NotionIntegration,
// // //   HubSpot: HubSpotIntegration,
// // // };

// // // export const IntegrationForm = () => {
// // //   const [integrationParams, setIntegrationParams] = useState({});
// // //   const [user, setUser] = useState('TestUser');
// // //   const [org, setOrg] = useState('TestOrg');
// // //   const [currType, setCurrType] = useState(null);
// // //   const [loading, setLoading] = useState(false);
// // //   const [error, setError] = useState(null);
// // //   const [expanded, setExpanded] = useState(true); // For collapsing integration section
// // //   const CurrIntegration = currType ? integrationMapping[currType] : null;

// // //   const handleTypeChange = (e, value) => {
// // //     setCurrType(value);
// // //     setIntegrationParams({});
// // //     setError(null);
// // //     setExpanded(true);
// // //   };

// // //   return (
// // //     <Box sx={{ maxWidth: 700, mx: 'auto' }}>
// // //       <Card elevation={3}>
// // //         <CardContent>
// // //           <Typography variant="h5" align="center" gutterBottom>
// // //             Integration Dashboard
// // //           </Typography>

// // //           {/* User and Org Inputs */}
// // //           <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
// // //             <TextField
// // //               label="User"
// // //               value={user}
// // //               onChange={(e) => setUser(e.target.value)}
// // //               fullWidth
// // //               size="small"
// // //               disabled={loading}
// // //             />
// // //             <TextField
// // //               label="Organization"
// // //               value={org}
// // //               onChange={(e) => setOrg(e.target.value)}
// // //               fullWidth
// // //               size="small"
// // //               disabled={loading}
// // //             />
// // //           </Box>

// // //           {/* Integration Selector */}
// // //           <Autocomplete
// // //             id="integration-type"
// // //             options={Object.keys(integrationMapping)}
// // //             value={currType}
// // //             onChange={handleTypeChange}
// // //             disabled={loading}
// // //             renderInput={(params) => (
// // //               <TextField {...params} label="Select Integration" size="small" />
// // //             )}
// // //             sx={{ mb: 3 }}
// // //           />

// // //           {/* Loading and Error States */}
// // //           {loading && (
// // //             <Box sx={{ textAlign: 'center', mb: 2 }}>
// // //               <CircularProgress size={24} />
// // //             </Box>
// // //           )}
// // //           {error && (
// // //             <Alert severity="error" sx={{ mb: 2 }}>
// // //               {error}
// // //             </Alert>
// // //           )}

// // //           {/* Integration Component */}
// // //           {CurrIntegration && !loading && (
// // //             <>
// // //               <Button
// // //                 variant="text"
// // //                 onClick={() => setExpanded(!expanded)}
// // //                 fullWidth
// // //                 sx={{ mb: 1, textTransform: 'none' }}
// // //               >
// // //                 {expanded ? 'Hide' : 'Show'} {currType} Integration
// // //               </Button>
// // //               <Collapse in={expanded}>
// // //                 <Box sx={{ mb: 3 }}>
// // //                   <CurrIntegration
// // //                     user={user}
// // //                     org={org}
// // //                     integrationParams={integrationParams}
// // //                     setIntegrationParams={setIntegrationParams}
// // //                   />
// // //                 </Box>
// // //               </Collapse>
// // //             </>
// // //           )}

// // //           {/* Data Form */}
// // // {integrationParams?.credentials && !loading && (
// // //   <Box sx={{ mt: 2 }}>
// // //     <DataForm
// // //       integrationType={currType} // Changed from integrationParams?.type to currType
// // //       credentials={integrationParams.credentials}
// // //       setLoading={setLoading}
// // //       setError={setError}
// // //     />
// // //   </Box>
// // // )}
// // //         </CardContent>
// // //       </Card>
// // //     </Box>
// // //   );
// // // };
// // // // import { useState } from 'react';
// // // // import {
// // // //     Box,
// // // //     Autocomplete,
// // // //     TextField,
// // // //     CircularProgress,
// // // //     Alert,
// // // //     Typography,
// // // //     Paper,
// // // //     IconButton,
// // // // } from '@mui/material';
// // // // import { AirtableIntegration } from './integrations/airtable';
// // // // import { NotionIntegration } from './integrations/notion';
// // // // import { HubSpotIntegration } from './integrations/hubspot'; // Add HubSpot
// // // // import { DataForm } from './data-form';

// // // // const integrationMapping = {
// // // //     'Airtable': AirtableIntegration,
// // // //     'Notion': NotionIntegration,
// // // //     'HubSpot': HubSpotIntegration, // Add HubSpot to the mapping
// // // // };

// // // // export const IntegrationForm = () => {
// // // //     const [integrationParams, setIntegrationParams] = useState({});
// // // //     const [user, setUser] = useState('TestUser');
// // // //     const [org, setOrg] = useState('TestOrg');
// // // //     const [currType, setCurrType] = useState(null);
// // // //     const [loading, setLoading] = useState(false); // Add loading state
// // // //     const [error, setError] = useState(null); // Add error state
// // // //     const CurrIntegration = integrationMapping[currType];

// // // //     // Reset integrationParams when switching integration types
// // // //     const handleTypeChange = (e, value) => {
// // // //         setCurrType(value);
// // // //         setIntegrationParams({}); // Clear params to avoid stale credentials
// // // //         setError(null); // Clear any previous errors
// // // //     };

// // // //     const handleCopyToken = () => {
// // // //         navigator.clipboard.writeText(integrationParams.credentials.access_token);
// // // //     };


// // // //     return (
// // // //         <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" sx={{ width: '100%' }}>
// // // //             <Box display="flex" flexDirection="column" sx={{ width: 300 }}>
// // // //                 <TextField
// // // //                     label="User"
// // // //                     value={user}
// // // //                     onChange={(e) => setUser(e.target.value)}
// // // //                     sx={{ mt: 2 }}
// // // //                     disabled={loading} // Disable during loading
// // // //                 />
// // // //                 <TextField
// // // //                     label="Organization"
// // // //                     value={org}
// // // //                     onChange={(e) => setOrg(e.target.value)}
// // // //                     sx={{ mt: 2 }}
// // // //                     disabled={loading}
// // // //                 />
// // // //                 <Autocomplete
// // // //                     id="integration-type"
// // // //                     options={Object.keys(integrationMapping)}
// // // //                     sx={{ mt: 2 }}
// // // //                     renderInput={(params) => <TextField {...params} label="Integration Type" />}
// // // //                     onChange={handleTypeChange}
// // // //                     value={currType}
// // // //                     disabled={loading}
// // // //                 />
// // // //             </Box>

// // // //             {error && (
// // // //                 <Alert severity="error" sx={{ mt: 2 }}>
// // // //                     {error}
// // // //                 </Alert>
// // // //             )}

// // // //             {loading && (
// // // //                 <Box sx={{ mt: 2 }}>
// // // //                     <CircularProgress />
// // // //                 </Box>
// // // //             )}

// // // //             {currType && !loading && (
// // // //                 <Box sx={{ mt: 2 }}>
// // // //                     <CurrIntegration
// // // //                         user={user}
// // // //                         org={org}
// // // //                         integrationParams={integrationParams}
// // // //                         setIntegrationParams={setIntegrationParams}
// // // //                     />
// // // //                 </Box>
// // // //             )}

// // // //             {integrationParams?.credentials && !loading && (
// // // //                 <Box sx={{ mt: 2 }}>
// // // //                     <DataForm
// // // //                         integrationType={integrationParams?.type}
// // // //                         credentials={integrationParams?.credentials}
// // // //                         setLoading={setLoading} // Pass setLoading to DataForm
// // // //                         setError={setError} // Pass setError to DataForm
// // // //                     />
// // // //                 </Box>
// // // //        )}

// // // //         </Box>
// // // //     );
// // // // };
