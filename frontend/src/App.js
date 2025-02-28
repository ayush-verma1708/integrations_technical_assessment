// /frontend/src/App.js
import { IntegrationForm } from './integration-form';

import { CssBaseline, Box } from '@mui/material';

function App() {
  return (
    <>
      <CssBaseline /> {/* Normalize CSS */}
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <IntegrationForm />
      </Box>
    </>
  );
}

export default App;