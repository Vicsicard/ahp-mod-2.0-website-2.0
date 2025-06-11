const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Function to load HTML components
app.get('/', (req, res) => {
  try {
    // Read the main index.html file
    let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
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
    
    res.send(indexHtml);
  } catch (err) {
    console.error('Error serving index page:', err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
