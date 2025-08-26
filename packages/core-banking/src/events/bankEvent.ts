import EventEmitter from "events";

class events extends EventEmitter {}

const BankEvent = new events()

BankEvent.on("BANK_CREATED", ()=>{
  console.log("BANK_CREATED event received")
})

export { BankEvent}