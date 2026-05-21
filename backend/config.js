module.exports = {
  // The IP address of the backend server.
  // When you write your backend IP here (e.g. '192.168.1.100'), 
  // CORS will dynamically allow requests from the frontend running on that same host/IP on any port.
  backendIp: '13.201.97.220',

  // The port the backend server listens on
  port: process.env.PORT || 5000,

  // Set to true to enable CORS origin checks, or false to allow any origin
  enableCors: true,

  // A specific origin to allow (e.g., 'http://192.168.1.100:5173'). 
  // If left empty, it will dynamically permit local connections and connections from the backendIp.
  // Set to '*' to allow all origins.
  allowedOrigin: '',
};
