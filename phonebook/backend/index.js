const express = require('express');
const app = express();
const cors = require('cors')
const morgan = require('morgan');
const Person = require('./models/person')
require('dotenv').config();

app.use(express.json());

// Morgan custom tokens
morgan.token('param-name', (req) => req.body.name || 'No Name');
morgan.token('param-number', (req) => req.body.number || 'No Number');

// Use Morgan for logging HTTP requests
app.use(morgan(
    ':method :url :status :res[content-length] - :response-time ms {"name": ":param-name"}","number": ":param-number"'
));
app.use(cors());
app.use(express.static('dist'));

let personsList = [];

// Route for HTML output
app.get('/', (request, response) => {
  response.send(personsList);
});


// API route for all JSON data
app.get('/api/persons', (request, response) => {
  Person.find({}).then(persons => {
    personsList = persons
    response.json(persons);
  })
});


// API route for a single item
app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
});


// API route for the PhoneBook info
app.get('/info', (request, response) => {
    response.send(printBookInfo());
});


// Adds an item to the resource
app.post('/api/persons', (request, response) => {
  const body = request.body;
  
  // Validate input fields
  const name = body.name?.trim();
  const number = body.number?.trim();

  if (!name || !number) {
    return response.status(400).json({ 
      error: 'Missing required person data'
    });
  }

  // Check for duplicate names (case-insensitive)
  const isDuplicate = personsList.some(
    p => p.name.toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    return response.status(409).json({ 
      error: 'Person has already been added to the PhoneBook'
    });
  }

  // Create a new person object
  const newPerson = new Person ({
    name,
    number
  });

  personsList = personsList.concat(newPerson);
  newPerson.save().then(savedPerson => {
    response.json(savedPerson);
  });
});

app.delete('/api/persons/:id', (request, response) => {
  const { id } = request.params;

  // Use Mongoose's findByIdAndDelete to delete the Person by ID from the database
  Person.findByIdAndDelete(id)
      .then(result => {
          if (result) {
              response.status(204).end();
          } else {
              response.status(404).json({ error: "Person not found" });
          }
      })
      .catch(error => {
          response.status(500).json({ error: "Failed to delete Person data", details: error.message });
      });
});


// this has to be the last loaded middleware, also all the routes should be registered before this!
app.use(errorHandler)


const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } 

  next(error)
}


// Helper function for the /info page
function printBookInfo() {
    let suffix = personsList.length > 1 && personsList.length !== 0 ? "people" : "person";
    const now = new Date();
    
    return `
    PhoneBook has info for ${personsList.length} ${suffix}
    <br />
    ${now.toString()}
    `;
}