import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

async function getCollection() {
  try {
    const client = await clientPromise
    const db = client.db("dentist_scheduler")
    return db.collection("appointments")
  } catch (e) {
    console.error("Failed to connect to the database", e)
    throw new Error("Failed to connect to the database")
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const phone = searchParams.get("phone")

  try {
    const appointmentsCollection = await getCollection()

    const query: any = {}
    if (date) {
      query.date = date
    }
    if (phone) {
      query.phone = phone
    }

    const appointments = await appointmentsCollection.find(query).toArray()
    return NextResponse.json(appointments)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const appointment = await request.json()
    const appointmentsCollection = await getCollection()

    // Check if the appointment slot is already booked
    const existingAppointment = await appointmentsCollection.findOne({
      date: appointment.date,
      time: appointment.time,
    })

    if (existingAppointment) {
      return NextResponse.json({ error: "This slot is already booked" }, { status: 400 })
    }

    const result = await appointmentsCollection.insertOne(appointment)
    appointment._id = result.insertedId

    return NextResponse.json(appointment, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 })
  }
}

