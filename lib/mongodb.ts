import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Function to create indexes
async function createIndexes() {
  try {
    const client = await clientPromise
    const db = client.db("dentist_scheduler")
    const collection = db.collection("appointments")

    // Create an index on the 'phone' field
    await collection.createIndex({ phone: 1 })
    console.log("Index created successfully on the phone field")

    // Create a compound index on date and time fields
    await collection.createIndex({ date: 1, time: 1 }, { unique: true })
    console.log("Compound index created successfully on date and time fields")
  } catch (error) {
    console.error("Error creating indexes:", error)
  }
}

// Call createIndexes function
createIndexes()

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

