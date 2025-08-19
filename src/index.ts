import express from 'express'
import crypto from 'node:crypto';
import path from 'path';
import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const app = express()
const PORT = 3000

app.use(express.json())

// Generate a new RSA key pair for demonstration purposes
// This is a one-time operation for the sake of the simulation.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});


// Store the public key to a file to simulate a stored certificate.
const __dirname = path.resolve();
const CERT_FILE = path.join(__dirname, './src/utils/public.pem');
fs.writeFile(CERT_FILE, publicKey);


// --- 1. Mock Existing JWT API Endpoint ---
// This endpoint simulates the "first step" of your process, providing a JWT.
// It uses the generated private key to sign the token.
app.get('/api/get-chatbot-jwt', (req, res) => {
    console.log('--- Step 1: Simulating JWT API call ---');

    const userData = {
        contactId: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        language: 'en-US',
        phoneNumber: '555-1234',
        primaryCustomerNumber: 'CUST-001',
        primaryAccountName: 'Acme Corp',
        username: 'johndoe' 
    };

    // The JWT is signed with the private key, ensuring its authenticity.
    const token = jwt.sign(userData, privateKey, {
        algorithm: 'RS256',
        expiresIn: '1h'
    });

    console.log('✅ Generated JWT:', token);
    res.json({ token });
});

// --- 2. Main Validation and Access Token Acquisition Endpoint ---
// This is the core of the application. It simulates the server-to-server logic.
app.get('/api/validate-and-get-token', async (req, res) => {
    
    try {
        // First, we simulate fetching the JWT from the existing API.
        const jwtApiResponse = await axios.get(`http://localhost:${PORT}/api/get-chatbot-jwt`);
        const jwtToken = jwtApiResponse.data.token;

        if (!jwtToken) {
            return res.status(400).json({ error: 'JWT token not found in the response.' });
        }

        console.log('Fetched JWT from mock API. Now validating...');
        console.log('\n--- Step 2: Validating JWT and getting Access Token ---');

        // Read the public key (cert) from the file system.
        // In a real application, you might get this from a remote source or a secure location.
        const cert = await fs.readFile(CERT_FILE);

        // Validate the JWT using the public key (cert).
        const decodedPayload = jwt.verify(jwtToken, cert, { algorithms: ['RS256'] });

        // IMPORTANT: At this point, the token is verified and the payload is trusted.
        // The decodedPayload now contains the complete user information, including the `username`.
        if (typeof decodedPayload !== 'object' || decodedPayload === null) {
            return res.status(400).json({ error: 'Invalid JWT payload.' });
        }
        const { username, ...userData } = decodedPayload as { [key: string]: any };

        console.log('✅ JWT successfully validated.');
        console.log('Extracted User Data:', userData);
        console.log('Extracted Missing Username:', username);

        // --- Step 3: Simulate OAuth2 Server-to-Server Call ---
        // This part simulates making a call to an OAuth2 endpoint to exchange the JWT
        // for a new access token for subsequent API calls.
        const mockOAuth2Endpoint = 'https://mock-oauth2-provider.com/token';

        // In a real scenario, you'd send the JWT as an assertion.
        // For this simulation, we'll just log the request payload.
        const oauthPayload = {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtToken,
            client_id: 'your-app-client-id',
            client_secret: 'your-app-client-secret',
            scope: 'read write'
        };

        console.log('\nSimulating POST to OAuth2 endpoint...');
        console.log('Request Payload:', oauthPayload);

        // --- This part would be a real API call to your OAuth2 provider.
        // You would use `axios.post()` here.
        // await axios.post(mockOAuth2Endpoint, oauthPayload);
        // For this demo, we'll return a mock success response.

        // After a successful call to the OAuth2 provider, it would return a new access token.
        const mockAccessToken = 'mock-oauth2-access-token-' + Date.now();

        console.log('✅ Successfully acquired new OAuth2 access token.');
        console.log('New Access Token:', mockAccessToken);

        // The process is complete. You now have the new access token to use for other API calls.
        res.status(200).json({
            message: 'Server-to-server process completed successfully.',
            validatedUserData: { ...userData, username },
            newAccessToken: mockAccessToken
        });

    } catch (error: any) {
        console.error('❌ An error occurred during the server-to-server process:', error);
        res.status(500).json({ error: 'Server-to-server process failed.' });
    }
});


app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
  console.log(`\nTo test, go to your browser and visit:\nhttp://localhost:${PORT}/api/validate-and-get-token`);
});
