import { config } from 'dotenv';


if (process.env.NODE_ENV !== 'production') {
  console.log('Loading dev environments');
  config();
}

// call after config() to access the env variables
import { app } from './api';

console.log('hola::'+process.env.DO_SPACE_URL)
const port = process.env.PORT || 3333;

app.listen(port, () =>
  console.log(`API available on http://localhost:${port}`)
);
