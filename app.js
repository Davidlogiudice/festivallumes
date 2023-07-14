const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const shuffle = require('lodash.shuffle');

const app = express();

// Middleware for parsing cookies
app.use(cookieParser());

// Session middleware
app.use(
  session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true
  })
);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Redirect root to /contact.html
app.get('/', (req, res) => {
  res.redirect('/pages/about-me.html');
});


// Handle 404 errors
app.use((req, res, next) => {
  if (req.originalUrl === '/contact' || req.originalUrl === '/captcha' || req.originalUrl === '/about-me') {
    next();
  } else {
    res.redirect('/pages/about-me.html');
  }
});

// Generate and serve the CAPTCHA image
app.get('/captcha', (req, res) => {
  const captcha = svgCaptcha.create();
  req.session.captcha = captcha.text;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(captcha.data);
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = getUniqueNumber();
    cb(null, uniqueSuffix + extension);
  }
});

const upload = multer({ storage });

// Contact form submission
app.post('/contact', upload.array('images', 2500), express.urlencoded({ extended: true }), (req, res) => {
  const { username, email, message, captcha } = req.body;
  const files = req.files;

  // Verify the CAPTCHA
  if (captcha !== req.session.captcha) {
    return res.send('Invalid CAPTCHA. Please try again.');
  }

  // Process the contact form data
  console.log('Contact form data:');
  console.log('Username:', username);
  console.log('Email:', email);
  console.log('Message:', message);
  console.log('Files:', files);

  // Send an email notification
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'iammrspeedyca@gmail.com',
      pass: 'drghongrzbwddodn'
    }
  });

  const mailOptions = {
    from: email,
    to: 'iammrspeedyca@gmail.com',
    subject: 'New Contact Form Submission',
    text: `Username: ${username}\nEmail: ${email}\nMessage: ${message}`,
    attachments: files ? files.map(file => ({ filename: file.originalname, path: file.path })) : []
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
  
      console.log('Email sent:', info.response);
   
  
    }
  });

  // Clear the CAPTCHA value from the session
  delete req.session.captcha;

  // Send a response to the client
  res.send('Message sent successfully!');
});

// Route to fetch three random media files
app.get('/about-me', (req, res) => {
  const mediaDir = path.join(__dirname, 'public/uploads');

  fs.readdir(mediaDir, (err, files) => {
    if (err) {
      console.error('Error reading media directory:', err);
      res.status(500).send('Internal Server Error');
    } else {
    
      const mediaList = files.map(file => {
        const extension = path.extname(file).toLowerCase();
        return { filename: file, type: getMediaType(extension) };
      });

      const shuffledMedia = shuffle(mediaList);
      const randomMedia = shuffledMedia.slice(0, 3);

      res.json(randomMedia);
    }
  });
});

// Function to determine media type based on file extension
function getMediaType(extension) {
  if (extension === '.jpg' || extension === '.png') {
    return 'image';
  } else if (extension === '.mp4') {
    return 'video';
  }
}

// Function to generate a unique number starting from 1
let uniqueNumber = 0;
function getUniqueNumber() {
  uniqueNumber++;
  return String(uniqueNumber);
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
