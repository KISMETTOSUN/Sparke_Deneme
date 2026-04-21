const { decrypt } = require('./encryption');

/**
 * Gets a Bearer token from UiPath Identity Server
 * Aligned with Autonomie project logic
 */
async function getUiPathToken(config) {
    const { url, client_id, client_secret, deployment_type } = config;
    const decryptedSecret = decrypt(client_secret);
    
    let identityUrl = '';
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    if (deployment_type === 'cloud') {
        identityUrl = 'https://cloud.uipath.com/identity_/connect/token';
    } else {
        identityUrl = `${cleanUrl}/identity/connect/token`;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', client_id);
    params.append('client_secret', decryptedSecret);
    
    // Aligned scope with Autonomie's implementation:
    params.append('scope', 'OR.Jobs OR.Robots OR.Queues OR.Folders OR.Execution');

    const response = await fetch(identityUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Token Hatası: ${err.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('[UiPath] Token başarıyla alındı.');
    return data.access_token;
}

/**
 * Constructs the base OData URL based on deployment type
 * Aligned with Autonomie project's formattedUrl logic
 */
function getUiPathODataUrl(config) {
    const { url, tenant, deployment_type } = config;
    let baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    if (deployment_type === 'cloud') {
        // Autonomie logic for formatting cloud URL with tenant
        if (!baseUrl.includes(tenant)) {
            baseUrl = `${baseUrl}/${tenant}`;
        }
        
        if (!baseUrl.endsWith('/orchestrator_/')) {
            baseUrl = baseUrl.endsWith('/') ? `${baseUrl}orchestrator_/` : `${baseUrl}/orchestrator_/`;
        }
        
        return `${baseUrl}odata`;
    } else {
        // On-Prem
        return `${baseUrl}/odata`;
    }
}

module.exports = {
    getUiPathToken,
    getUiPathODataUrl
};
