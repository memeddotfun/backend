import { PinataSDK } from "pinata";

if (!process.env.PINATA_JWT || !process.env.PINATA_GATEWAY) {
    throw new Error("PINATA_JWT and PINATA_GATEWAY must be set");
}

export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});