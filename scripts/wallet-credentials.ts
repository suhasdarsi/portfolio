// Where the local Wallet scripts find the signing credentials. Never inside this repository.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { walletPass } from '../src/pocket-card/contact';

export const credentialDir = process.env.WALLET_CREDENTIAL_DIR ?? join(homedir(), '.wallet-contact');

export const credentials = {
  certificate: join(credentialDir, `${walletPass.passTypeIdentifier}.cert.pem`),
  key: join(credentialDir, `${walletPass.passTypeIdentifier}.key.pem`),
  intermediate: join(credentialDir, 'wwdr.pem'),
  root: join(credentialDir, 'apple-root.pem'),
};
