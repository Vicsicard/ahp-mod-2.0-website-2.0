const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

console.log('Starting server...');
console.log('Current directory:', __dirname);

// Serve static files from the current directory
app.use(express.static(__dirname));
console.log('Serving static files from:', __dirname);

// Function to load HTML components
app.get('/', (req, res) => {
  console.log('Received request for /');
  try {
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
      'footer.html'
    ];
    
    // Create a placeholder in the index.html where components will be inserted
    let componentsHtml = '';
    console.log('Loading component files...');
    
    // Read each component file and append its content
    componentFiles.forEach(file => {
      try {
        const componentPath = path.join(__dirname, 'components', file);
        console.log(`Checking component file: ${file} at path: ${componentPath}`);
        if (fs.existsSync(componentPath)) {
          console.log(`Loading component: ${file}`);
          componentsHtml += fs.readFileSync(componentPath, 'utf8');
        } else {
          console.warn(`Component file not found: ${componentPath}`);
        }
      } catch (err) {
        console.error(`Error reading component ${file}:`, err);
      }
    });
    
    // Insert all components before the closing body tag
    console.log('Inserting components into index.html');
    indexHtml = indexHtml.replace('</body>', componentsHtml + '</body>');
    
    console.log('Sending response to client');
    res.send(indexHtml);
  } catch (err) {
    console.error('Error serving index page:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Ready to serve requests');
});
