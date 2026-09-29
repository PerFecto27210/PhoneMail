import {httpRouter} from 'convex/server';
import { handleWelcome, handleMenu, handleVerification } from "./convex/twilio";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const router = httpRouter();    


router.route({path:"/ivr/welcome", method:"POST", handler: handleWelcome});
router.route({path:"/ivr/menu", method:"POST", handler: handleMenu});
router.route({path:"/ivr/verify", method:"POST", handler: handleVerification});