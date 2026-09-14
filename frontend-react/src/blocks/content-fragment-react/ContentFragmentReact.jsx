import React, { useEffect, useMemo, useState } from 'react';

/**
 * Converts nested JSON into rows suitable for a Property/Value table.
 *
 * Example:
 * {
 *   "metadata": {
 *     "title": "Product"
 *   }
 * }
 *
 * Becomes:
 * metadata.title = Product
 */
function flattenJson(value, prefix = '', rows = []) {
  if (value === null) {
    rows.push({
      property: prefix || 'value',
      value: 'null',
    });

    return rows;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({
        property: prefix || 'value',
        value: '[]',
      });

      return rows;
    }

    value.forEach((item, index) => {
      const property = prefix
        ? `${prefix}[${index}]`
        : `[${index}]`;

      if (item !== null && typeof item === 'object') {
        flattenJson(item, property, rows);
      } else {
        rows.push({
          property,
          value: String(item),
        });
      }
    });

    return rows;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      rows.push({
        property: prefix || 'value',
        value: '{}',
      });

      return rows;
    }

    entries.forEach(([key, item]) => {
      const property = prefix
        ? `${prefix}.${key}`
        : key;

      if (item !== null && typeof item === 'object') {
        flattenJson(item, property, rows);
      } else {
        rows.push({
          property,
          value: item === undefined ? '' : String(item),
        });
      }
    });

    return rows;
  }

  rows.push({
    property: prefix || 'value',
    value: String(value),
  });

  return rows;
}

/**
 * Removes trailing slashes so URL concatenation does not produce "//".
 */
function removeTrailingSlash(value = '') {
  return value.replace(/\/+$/, '');
}

/**
 * Converts an AEM repository path to an Asset HTTP API URL.
 *
 * Input:
 * /content/dam/my-site/products/product-a
 *
 * Output:
 * https://author...adobeaemcloud.com/api/assets/my-site/products/product-a.json
 */
function buildAssetApiUrl(fragmentPath, configuration) {
  const host = removeTrailingSlash(configuration.host);
  const apiBasePath = configuration.apiBasePath.startsWith('/')
    ? removeTrailingSlash(configuration.apiBasePath)
    : `/${removeTrailingSlash(configuration.apiBasePath)}`;

  let assetPath = fragmentPath.trim();

  try {
    if (/^https?:\/\//i.test(assetPath)) {
      assetPath = new URL(assetPath).pathname;
    }
  } catch (error) {
    throw new Error(`Invalid Content Fragment URL: ${fragmentPath}`);
  }

  assetPath = assetPath
    .replace(/^\/content\/dam\/?/, '')
    .replace(/^\/api\/assets\/?/, '')
    .replace(/^\/+/, '')
    .replace(/\.json$/i, '');

  if (!assetPath) {
    throw new Error('The Content Fragment repository path is empty.');
  }

  return `${host}${apiBasePath}/${assetPath}.json`;
}

function LoadingMessage() {
  return (
    <div className="content-fragment-status" role="status">
      Loading Content Fragment...
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="content-fragment-error" role="alert">
      <strong>Unable to load Content Fragment.</strong>
      <span>{message}</span>
    </div>
  );
}

function EmptyMessage() {
  return (
    <div className="content-fragment-status">
      The Content Fragment response does not contain any properties.
    </div>
  );
}

function JsonTable({ data }) {
  const rows = useMemo(() => flattenJson(data), [data]);

  if (rows.length === 0) {
    return <EmptyMessage />;
  }

  return (
    <div className="content-fragment-table-container">
      <table className="content-fragment-table">
        <caption className="content-fragment-visually-hidden">
          Content Fragment properties
        </caption>

        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Value</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.property}-${index}`}>
              <th scope="row">{row.property}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContentFragment({
  fragmentPath,
  configuration,
}) {
  const [json, setJson] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadContentFragment() {
      setLoading(true);
      setError('');
      setJson(null);

      try {
        const endpoint = buildAssetApiUrl(
          fragmentPath,
          configuration,
        );

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'omit',
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Request returned HTTP ${response.status} ${response.statusText}.`,
          );
        }

        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON but received "${contentType || 'unknown content type'}".`,
          );
        }

        const responseJson = await response.json();

        setJson(responseJson);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          console.error(
            'Content Fragment React block request failed:',
            requestError,
          );

          setError(requestError.message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadContentFragment();

    return () => {
      abortController.abort();
    };
  }, [fragmentPath, configuration]);

  if (loading) {
    return <LoadingMessage />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return <JsonTable data={json} />;
}