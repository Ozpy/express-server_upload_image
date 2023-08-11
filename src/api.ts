import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AWS from 'aws-sdk';
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';

export const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.raw({ type: 'application/vnd.custom-type' }));
app.use(express.text({ type: 'text/html' }));

const client = new ChromaClient();

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

  if (!file) {
    res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    return;
  }

  const bucketName = process.env.DO_SPACES_BUCKET;
  const params = {
    Bucket: bucketName,
    Key: Date.now() + '_' + file.originalname,
    Body: file.buffer,
    ACL: 'public-read'
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Error al cargar el archivo:', err);
      res.status(500).json({ error: 'Error al cargar el archivo' });
    } else {
      const imageUrl = data.Location;
      console.log('Archivo cargado exitosamente:', imageUrl);
      res.json({ imageUrl });
    }
  });
});

app.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

app.post('/api/v1/hello', (req, res) => {
  console.log('Hello world');
  console.log(res);

  res.status(200).send({ message: 'Hello world' });
});

async function createCollection(nameCollection: any) {
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: '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'
  });
  const collection = await client.createCollection({
    name: nameCollection,
    embeddingFunction: embedder
  });
  return collection;
}

async function addDocument({ collectionName, document }) {
  const collection = await client.getCollection(collectionName);
  const doc = await collection.add(document);
  return doc;
}

async function queryCollection(collectionName: any, query: any) {
  // const collection = await client.getCollection(collectionName)
  // const results = await collection.query(query)
  // return results;
}

app.post('/api/v1/createEmbedding', (req, res) => {
  createCollection(req.body.nameCollection)
    .then((collection: any) => {
      addDocument({
        collectionName: req.body.nameCollection,
        document: req.body.document
      });
    })
    .then((doc: any) => {
      return queryCollection(req.body.nameCollection, req.body.query);
    })
    .then((results: any) => {
      res
        .status(200)
        .send({ message: 'create_chat_embedding', results: results });
    })
    .catch((err: any) => {
      console.log('errorcreate_chat_embedding');
      console.log(err);
    });

  res.status(200).send({ message: 'create_chat_embedding' });
});

app.post('/api/v1/bye', (req, res) => {
  res.status(200).send({ message: 'Hello world' });
});

// const dataTest = {
//   vectors: [
//     {
//       id: 'Mi nombre es Horacio y soy un vendedor',
//       metadata: { danger: 0, type: 'personal data' }
//     },
//     {
//       id: 'Mi nombre es Javier y soy programador de paginas web',
//       metadata: { danger: 0, type: 'personal data' }
//     },
//     {
//       id: 'Mi nombre es Juan y soy un vendedor',
//       metadata: { danger: 0, type: 'personal data' }
//     }
//   ]
// };

app.post('/api/v1/gptExecuteSQL', (req, res) => {
  const prompt = 'conoces a alguna programadora';

  queryData('langchain', prompt).then((result: any) => {
    res.status(200).send({ message: 'Hello world', result: result });
  });
});

app.post('/api/v1/gptUpsertData', (req, res) => {
  const indexName = req.body?.indexName;
  const data = req.body?.data;

  formatData(data)
    .then((res: any) => {
      return upsertData(indexName, res);
    })
    .then((result: any) => {
      res.status(200).send({ message: 'Search', result: result });
    })
    .catch((err: any) => {
      console.error('🚀 ~ file: api.ts:153 ~ app.post ~ err:', err);
      res.status(500).send({ message: 'Error', result: err });
    });
});

app.post('/api/v1/gptSearch', (req, res) => {
  const indexName = req.body?.indexName;
  const query = req.body?.query;

  queryData(indexName, query)
    .then((result: any) => {
      res.status(200).send({ message: 'Search', result: result });
    })
    .catch((err: any) => {
      res.status(500).send({ message: 'Error', result: err });
    });
});

import { PineconeClient } from '@pinecone-database/pinecone';

async function formatData(data: any) {
  return await processVectors(data).then((result: any) => {
    return result;
  });
}

async function processVectors(data: any) {
  const newVectorsFormatted = await Promise.all(
    data.vectors.map(async (vector: any) => {
      const result = await embedText(vector.id);
      return {
        ...vector,
        values: result
      };
    })
  );

  return newVectorsFormatted;
}

async function initializePinecone() {
  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: 'us-west4-gcp-free',
    apiKey: '905807c4-bbfc-48be-88a9-068b53894cd3'
  });

  return pinecone;
}

// async function getIndexes() {
//   const pinecone = await initializePinecone();
//   const indexesList = await pinecone.listIndexes();
//   return indexesList;
// }

async function upsertData(indexName: any, data: any) {
  const pinecone = await initializePinecone();
  const index = pinecone.Index(indexName);

  const result = await index.upsert({
    upsertRequest: {
      vectors: data
    }
  });
  return result;
}

async function queryData(indexName: any, text: any) {
  // const indexes = getIndexes();

  const embed = await embedText(text);
  const pinecone = await initializePinecone();
  const index = pinecone.Index(indexName);

  const result = await index.query({
    queryRequest: {
      vector: embed,
      includeValues: false,
      topK: 5
    }
  });
  return result;
}

//openAI
import { Configuration, OpenAIApi } from 'openai';

const API_KEY = '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';
const MODEL_VERSION = 'text-embedding-ada-002';
const configuration = new Configuration({
  apiKey: API_KEY
});
const openai = new OpenAIApi(configuration);

export async function embedText(text: string) {
  try {
    const response = await openai.createEmbedding({
      model: MODEL_VERSION,
      input: text
    });
    return response.data.data[0].embedding;
  } catch (e) {
    return [];
  }
}

// export async function createCompletion({ messages, temperature = 1 }) {
//   const systemMessages = messages.filter(
//     (message) => message.role === openaiRoles.SYSTEM
//   );

//   const noSystemMessages = messages.filter(
//     (message) => message.role !== openaiRoles.SYSTEM
//   );
//   const lastMessages =
//     noSystemMessages.length > 10
//       ? noSystemMessages.slice(-10)
//       : noSystemMessages;
//   const prompt = lastMessages
//     .slice(0, lastMessages.length - 1)
//     .concat(systemMessages, lastMessages.slice(lastMessages.length - 1));
//   try {
//     const completion = await openai.createChatCompletion({
//       temperature,
//       max_tokens: 150,
//       model: 'gpt-3.5-turbo',
//       messages: prompt
//     });
//     console.log(completion);

//     return completion;
//   } catch (e) {
//     console.error('🚀 ~ file: openai.js:39 ~ createCompletion ~ e:', e);
//     return null;
//   }
// }
