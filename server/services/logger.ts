export const logger = {
  info: (event: string, meta: any = {}) => {
    console.log(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...meta }));
  },
  error: (event: string, err: any, meta: any = {}) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      event, 
      timestamp: new Date().toISOString(), 
      error: err.message || err.toString(),
      stack: err.stack,
      ...meta 
    }));
  },
  warn: (event: string, meta: any = {}) => {
    console.warn(JSON.stringify({ level: 'warn', event, timestamp: new Date().toISOString(), ...meta }));
  }
};
