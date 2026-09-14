import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentFragmentReact from './ContentFragmentReact.jsx';

/**
 * Reads the authored Content Fragment reference from EDS block markup.
 *
 * A reference field can be serialized as an anchor:
 *
 * <div>
 *   <div>
 *     <a href="/am/site/product...</a>
 *   </div>
 * </div>
 *
 * A text field can be serialized as plain text:
 *
 * <div>
 *   <div>/content/dam/site/product</div>
 * </div>
 */
function getFragmentPath(block) {
  const reference = block.querySelector('a[href]');

  if (reference) {
    try {
      const url = new URL(reference.href, window.location.origin);
      return url.pathname;
    } catch (error) {
      console.warn(
        'Unable to parse Content Fragment reference URL.',
        error,
      );
    }
  }

  const firstCell = block.querySelector(':scope > div > div');

  return firstCell.textContent.trim()
    || block.textContent.trim();
}

async function getRuntimeConfiguration() {
  //const module = await import('/scripts/config.js');

  //const configuration = module.APP_CONFIG.contentFragmentReact;
  const configuration = window.APP_CONFIG.contentFragmentReact;

  if (!configuration.host) {
    throw new Error(
      'APP_CONFIG.contentFragmentReact.host is not configured.',
    );
  }

  return {
    host: configuration.host,
    apiBasePath: configuration.apiBasePath || '/api/assets',
  };
}

function renderConfigurationError(block, error) {
  console.error(
    'Content Fragment React block configuration failed:',
    error,
  );

  block.replaceChildren();

  const errorElement = document.createElement('div');
  errorElement.className = 'content-fragment-error';
  errorElement.setAttribute('role', 'alert');
  errorElement.textContent = error.message;

  block.append(errorElement);
}

/**
 * EDS block decorator.
 *
 * EDS calls this function after loading:
 * /blocks/content-fragment/content-fragment.js
 */
export default async function decorate(block) {
  const fragmentPath = getFragmentPath(block);

  if (!fragmentPath) {
    renderConfigurationError(
      block,
      new Error('Content Fragment reference is not configured.'),
    );

    return;
  }

  try {
    //const configuration = await getRuntimeConfiguration();
	const configuration = getRuntimeConfiguration();

    /*
     * Preserve the original authored markup until all required values have
     * been read. Then replace it with an isolated React mount point.
     */
    const reactContainer = document.createElement('div');
    reactContainer.className = 'content-fragment-react-root';

    block.replaceChildren(reactContainer);

    const root = createRoot(reactContainer);

    /*
     * Store the root on the DOM element to help with debugging and prevent
     * accidental duplicate roots if a block is decorated more than once.
     */
    reactContainer.reactRoot = root;

    root.render(
      <React.StrictMode>
        <ContentFragmentReact
          fragmentPath={fragmentPath}
          configuration={configuration}
        />
      </React.StrictMode>,
    );
  } catch (error) {
    renderConfigurationError(block, error);
  }
}