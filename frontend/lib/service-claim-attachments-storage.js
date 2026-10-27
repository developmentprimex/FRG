import fs from "fs/promises";
import path from "path";

function getRootDir() {
  return path.join(process.cwd(), "data", "service-claim-uploads");
}

function getClaimDir(claimId) {
  return path.join(getRootDir(), claimId);
}

/**
 * Persist binary attachment bodies after the claim row exists. Files are named by
 * zero-based index so they align with `attachmentsJson` array order.
 */
export async function persistServiceClaimAttachments(claimId, parts) {
  if (!parts?.length) {
    return;
  }
  const dir = getClaimDir(claimId);
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < parts.length; i += 1) {
    await fs.writeFile(path.join(dir, String(i)), parts[i].content);
  }
}

export async function readServiceClaimAttachmentBytes(claimId, index) {
  const filePath = path.join(getClaimDir(claimId), String(index));
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteServiceClaimAttachments(claimId) {
  const dir = getClaimDir(claimId);
  await fs.rm(dir, { recursive: true, force: true });
}
