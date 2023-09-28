const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const url = require('url');

const app = express();
const port = 3000;

app.use(cors());
app.use(helmet());

app.get('/check-security', (req, res) => {
  const websiteUrl = req.query.url;

  try {
    // Check if the URL starts with "https://" or "http://"
    if (websiteUrl.startsWith('https://') || websiteUrl.startsWith('http://')) {
      const protocol = websiteUrl.startsWith('https://') ? https : http;

      // Make a GET request to the provided URL
      protocol.get(websiteUrl, (response) => {
        if (response.statusCode === 200) {
          // The website is reachable, now check if it's secure
          if (response.socket.encrypted) {
            const cspHeader = response.headers['content-security-policy'];
            if (cspHeader) {
              // Analyze the CSP header
              if (isCSPSecure(cspHeader)) {
                res.send(`${websiteUrl} is secure (uses HTTPS) and has a secure CSP policy: ${cspHeader}`);
              } else {
                res.send(`${websiteUrl} is secure (uses HTTPS), but the CSP policy may have security issues: ${cspHeader}`);
              }
            } else {
              res.send(`${websiteUrl} is secure (uses HTTPS) but does not have CSP configured.`);
            }
          } else {
            res.send(`${websiteUrl} is reachable but not secure (does not use HTTPS).`);
          }
        } else if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          // If it's a redirect status code, get the final URL
          const finalUrl = url.resolve(websiteUrl, response.headers.location);
          res.send(`${websiteUrl} is redirecting to ${finalUrl}.`);
        } else {
          res.send(`${websiteUrl} is not reachable (HTTP status code: ${response.statusCode}).`);
        }
      }).on('error', (error) => {
        res.send(`${websiteUrl} could not be reached or an error occurred: ${error.message}`);
      });
    } else {
      res.send(`${websiteUrl} is not a valid URL (missing "http://" or "https://").`);
    }
  } catch (error) {
    res.send(`${websiteUrl} could not be reached or an error occurred.`);
  }
});

function isCSPSecure(cspHeader) {
  // Check for "unsafe-inline" or "unsafe-eval" directives in CSP header
  const unsafeDirectives = ['unsafe-inline', 'unsafe-eval'];
  
  // Regular expression to match unsafe directives
  const unsafeDirectiveRegex = new RegExp(`'(${unsafeDirectives.join('|')})'`, 'i');

  // Check script-src, style-src, and img-src directives for unsafe directives
  return (
    !unsafeDirectiveRegex.test(cspHeader) &&
    !/script-src\s+'self'/i.test(cspHeader) &&
    !/style-src\s+'self'/i.test(cspHeader) &&
    !/img-src\s+'self'/i.test(cspHeader)
  );
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});