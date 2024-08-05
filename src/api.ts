import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AWS from 'aws-sdk';

export const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.raw({ type: 'application/vnd.custom-type' }));
app.use(express.text({ type: 'text/html' }));

// Configuración de AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.DO_SPACES_ID,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  endpoint: new AWS.Endpoint(process.env.DO_SPACE_URL)
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('media'), (req: any, res) => {
  const file = req.file;

  console.log('ENV:', process.env);

  if (!file) {
    res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    return;
  }

  const bucketName = process.env.DO_SPACES_BUCKET;
  const params = {
    Bucket: bucketName,
    Key: Date.now() + '_' + file.originalname,
    Body: file.buffer,
    ACL: 'public-read',
    ContentDisposition: 'inline',
    ContentType: file.mimetype
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error al cargar el archivo:', err);
      res.status(500).json({ error: 'Error al cargar el archivo' });
    } else {
      const imageUrl = data.Location;
      //loguito-images-space.nyc3.cdn.digitaloceanspaces.com/100900964_2733938383399722_3156079111701528576_n.png
      const imageRemoveCDN = imageUrl.replace('nyc3.cdn', 'nyc3');

      console.log('Archivo cargado exitosamente:', imageRemoveCDN);
      res.json({ imageUrl });
    }
  });
});

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

app.get('/api/v1/hello', (req, res) => {
  res.status(200).send({ message: 'Hello world ' });
});
