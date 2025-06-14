const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server...');
console.log('Current directory:', __dirname);

// Security middleware to block WordPress scanning attempts and other common exploits
app.use((req, res, next) => {
  const blockedPaths = [
    '/wp-admin',
    '/wordpress',
    '/xmlrpc.php',
    '/wp-login.php',
    '/wp-content',
    '/wp-includes',
    '/wp-json',
    '/wp-config',
    '/setup-config.php',
    '/admin',
    '/administrator',
    '/.env',
    '/.git',
    '/config',
    '/install',
    '/phpmyadmin'
  ];
  
  const path = req.path.toLowerCase();
  const userAgent = req.get('user-agent') || '';
  const referer = req.get('referer') || '';
  
  // Block by path
  if (blockedPaths.some(blockedPath => path.includes(blockedPath))) {
    console.log(`Blocked access attempt to: ${req.path} from IP: ${req.ip}`);
    return res.status(403).send('Access Denied');
  }
  
  // Block suspicious user agents
  const suspiciousAgents = ['dirbuster', 'nikto', 'sqlmap', 'scanbot', 'wpscan', 'nmap'];
  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    console.log(`Blocked suspicious user agent: ${userAgent} from IP: ${req.ip}`);
    return res.status(403).send('Access Denied');
  }
  
  // Rate limiting - simple implementation
  // In a production environment, use a proper rate limiting library
  const clientIp = req.ip;
  const now = Date.now();
  
  // Create IP tracking if it doesn't exist
  if (!global.ipRequests) {
    global.ipRequests = {};
  }
  
  if (!global.ipRequests[clientIp]) {
    global.ipRequests[clientIp] = {
      count: 1,
      firstRequest: now
    };
  } else {
    // Reset count if it's been more than 1 minute
    if (now - global.ipRequests[clientIp].firstRequest > 60000) {
      global.ipRequests[clientIp] = {
        count: 1,
        firstRequest: now
      };
    } else {
      global.ipRequests[clientIp].count++;
      
      // If more than 100 requests in a minute, block temporarily
      if (global.ipRequests[clientIp].count > 100) {
        console.log(`Rate limited IP: ${clientIp} - too many requests`);
        return res.status(429).send('Too Many Requests');
      }
    }
  }
  
  next();
});

// Add comprehensive security headers
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'");
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
  next();
});

// Serve static files from the current directory with caching
app.use(express.static(__dirname, {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      // Don't cache HTML files
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
console.log('Serving static files from:', __dirname);

// Function to load HTML components
// Cache for the compiled index page
let cachedIndexHtml = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

app.get('/', (req, res) => {
  console.log('Received request for /');
  try {
    const currentTime = Date.now();
    
    // Use cached version if available and not expired
    if (cachedIndexHtml && (currentTime - lastCacheTime < CACHE_DURATION)) {
      console.log('Serving cached index.html');
      return res.send(cachedIndexHtml);
    }
    
    // Read the main index.html file
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Reading index.html from:', indexPath);
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    console.log('Successfully read index.html');
    
    // Load all component HTML files
    const componentFiles = [
      'navbar.html',
      'hero.html',
      'features.html',
      'how-it-works.html',
      'testimonials.html',
      'faq.html',
      'install.html',
      'next.html',
      'footer.html'
    ];
    
    // Create a placeholder in the index.html where components will be inserted
    let componentsHtml = '';
    console.log('Loading component files...');
    
    // Read each component file and append its content
    componentFiles.forEach(file => {
      try {
        const componentPath = path.join(__dirname, 'components', file);
        if (fs.existsSync(componentPath)) {
          componentsHtml += fs.readFileSync(componentPath, 'utf8');
        } else {
          console.warn(`Component file not found: ${componentPath}`);
        }
      } catch (err) {
        console.error(`Error reading component ${file}:`, err);
      }
    });
    
    // Insert all components before the closing body tag
    indexHtml = indexHtml.replace('</body>', componentsHtml + '</body>');
    
    // Update cache
    cachedIndexHtml = indexHtml;
    lastCacheTime = currentTime;
    
    console.log('Sending response to client');
    res.send(indexHtml);
  } catch (err) {
    console.error('Error serving index page:', err);
    res.status(500).send('Server error');
  }
});

// Create robots.txt to block scanners
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /wp-admin/
Disallow: /wp-login/
Disallow: /wp-content/
Disallow: /wp-includes/
Disallow: /xmlrpc.php
Disallow: /wordpress/
Disallow: /admin/
Disallow: /administrator/
Disallow: /.env
Disallow: /.git/
Disallow: /config/
Disallow: /install/
Disallow: /phpmyadmin/

User-agent: *
Allow: /
`);
});

// Handle 404 errors with more information for debugging but less for attackers
app.use((req, res) => {
  const clientIp = req.ip;
  const userAgent = req.get('user-agent') || 'Unknown';
  
  // Log detailed information but return minimal response
  console.log(`404 Not Found: ${req.path} | IP: ${clientIp} | UA: ${userAgent}`);
  res.status(404).send('404 Not Found');
});

// Error handling for the server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Ready to serve requests');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please use a different port.`);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Keep the server running despite uncaught exceptions
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the server running despite unhandled rejections
});
