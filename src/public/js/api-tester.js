window.executeApiRequest = async function(method, endpoint, body = null) {
  const tokenInput = document.getElementById('jwtAuthToken');
  const token = tokenInput ? tokenInput.value.trim() : '';
  const statusBadge = document.getElementById('apiResponseStatus');
  const responseOutput = document.getElementById('apiResponseBody');

  if (statusBadge) {
    statusBadge.className = 'badge bg-secondary';
    statusBadge.innerText = 'Sending request...';
  }
  if (responseOutput) {
    responseOutput.innerText = 'Loading...';
  }

  const headers = {
    'Accept': 'application/json'
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const startTime = performance.now();

  try {
    const options = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);
    const duration = Math.round(performance.now() - startTime);

    let json;
    try {
      json = await response.json();
    } catch (_) {
      json = { status: response.status, statusText: response.statusText };
    }

    if (statusBadge) {
      if (response.ok) {
        statusBadge.className = 'badge bg-success';
      } else if (response.status === 401 || response.status === 403) {
        statusBadge.className = 'badge bg-warning text-dark';
      } else {
        statusBadge.className = 'badge bg-danger';
      }
      statusBadge.innerText = `HTTP ${response.status} ${response.statusText} (${duration}ms)`;
    }

    if (responseOutput) {
      responseOutput.innerText = JSON.stringify(json, null, 2);
    }
  } catch (err) {
    if (statusBadge) {
      statusBadge.className = 'badge bg-danger';
      statusBadge.innerText = 'Network Error';
    }
    if (responseOutput) {
      responseOutput.innerText = `Error connecting to API endpoint:\n${err.message}`;
    }
  }
};

window.loadPreset = function(method, endpoint, body) {
  const methodEl = document.getElementById('apiReqMethod');
  const endpointEl = document.getElementById('apiReqEndpoint');
  const bodyEl = document.getElementById('apiReqBody');

  if (methodEl) methodEl.value = method;
  if (endpointEl) endpointEl.value = endpoint;
  if (bodyEl) bodyEl.value = body || '';

  window.executeApiRequest(method, endpoint, body);
};

window.sendCustomRequest = function() {
  const methodEl = document.getElementById('apiReqMethod');
  const endpointEl = document.getElementById('apiReqEndpoint');
  const bodyEl = document.getElementById('apiReqBody');

  const method = methodEl ? methodEl.value : 'GET';
  const endpoint = endpointEl ? endpointEl.value : '/api/customers';
  const bodyText = bodyEl ? bodyEl.value.trim() : '';

  window.executeApiRequest(method, endpoint, bodyText ? bodyText : null);
};

