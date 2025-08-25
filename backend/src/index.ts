import { app } from '@azure/functions';

// Import all functions
import './functions/test';
import './functions/healthCheck';
import './functions/manualSyncSimple';
import './functions/manualSync';
import './functions/timerSync';
import './functions/dataSummary';
import './functions/currencyData';
import './functions/seriesData';
import './functions/monitoring';

// Export the app - this is the entry point for Azure Functions v4
export default app;
