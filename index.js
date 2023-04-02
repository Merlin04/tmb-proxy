import * as dotenv from "dotenv";
import express from "express";
import child_process from "child_process";
dotenv.config();

const execute = command => new Promise((res, rej) => child_process.exec(command, (err, stdout, stderr) => err ? rej() : stderr ? rej(stderr) : res(stdout)));

const TS = process.env.TAILSCALE_URL;
const TMB_PORT = process.env.TMB_PORT;

const FETCH_URL = `http://${TS}:${TMB_PORT}/llapi/poll`;

const app = express();

const UNAVAILABLE_RESP = () => ({ status: 0 });
let cache = UNAVAILABLE_RESP();

app.get("/", (req, res) => {
	res.json(cache);
});

const task = async () => {
	// refetch cache
	const t = JSON.parse(await execute("tailscale status --json"));
	const peerOnline = (Object.values(t.Peer).find(p => p.TailscaleIPs.includes(TS) || p.DNSName === TS) ?? t.Self).Online;
	if(!peerOnline) {
		console.log("Peer offline");
		cache = UNAVAILABLE_RESP();
		return;
	}

	try {
		cache = await fetch(FETCH_URL).then(r => r.json());
		console.log("Successfully updated cache");
	} catch(_e) {
		console.log("Error while fetching");
		cache = UNAVAILABLE_RESP(); return;
	}
};
task();
setInterval(task, 5000);

app.listen(Number(process.env.PORT), () => {
	console.log("Yeag");
});
