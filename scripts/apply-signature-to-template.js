#!/usr/bin/env node

/**
 * Copies scriptSignature/scriptPublicKey from dist/config.json (written by
 * `npm run sign`) into config.json.template — the file the Docker image
 * ships to render per-deployment config.json at container startup.
 *
 * config.json.template is valid JSON (the ${VAR} placeholders are just
 * literal text inside JSON string values), so a parse/stringify round-trip
 * is safe here, including against the signature's base64 content.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "dist", "config.json");
const TEMPLATE_PATH = path.join(__dirname, "..", "config.json.template");

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));

template.scriptSignature = config.scriptSignature;
template.scriptPublicKey = config.scriptPublicKey;

fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2) + "\n");

console.log("[apply-signature-to-template] config.json.template updated with signature");
