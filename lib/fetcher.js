import { SECRET_KEY, SYNC_LOGIN_ENDPOINT } from '../cfg';

let cookie = null;

/**
 * Fetches a URL from the producer.  Handling login and retry.
 *
 * @param {string} url The url we need.
 * @param {RequestInit} options Options which are fetched.
 * @return {Promise<Response>} Response from fetch when executed successfully.
 */
export default async function fetcher(url, options, isRetry = false) {
  if(!(SYNC_LOGIN_ENDPOINT && SECRET_KEY)) {
    console.log(`SYNC_LOGIN_ENDPOINT or SECRET_KEY not provided. Performing an unauthenticated call`);
    return await fetch(url, options);
  } else {
    if (cookie) {
      console.log('Going to fetch with previously retrieved cookie');
    } else {
      console.log('Attempt to login to get a cookie');
      await login();
    }

    // do fetch call as usual but add cookie
    const fetchOptions = Object.assign( {}, options || {} );
    fetchOptions.headers = fetchOptions.headers || {};
    fetchOptions.headers.cookie = cookie;

    // send fetch
    console.log(`Going to send fetch with ${JSON.stringify(fetchOptions)}`);

    let resp = await fetch(url, fetchOptions);

    if (resp.status == 400 && !isRetry){
      console.log(`Fetch ${url} failed with status 400. Going to retry once.`);
      cookie = null;
      return await fetcher(url, options, true);
    } else {
      // extract new cookie if provided and set it
      if (resp.headers.getSetCookie().length) {
        const [newCookie] = resp.headers.getSetCookie();
        console.log(`Got new cookie from response. Setting cookie: ${newCookie}`);
        cookie = newCookie;
      }

      return resp;
    }
  }
}

async function login() {
  try {
    const resp = await fetch(SYNC_LOGIN_ENDPOINT, {
      headers: {
        'key': SECRET_KEY,
        'accept': 'application/vnd.api+json'
      },
      method: 'POST'
    });

    if (resp.ok) {
      if (resp.headers.getSetCookie().length) {
        const [newCookie] = resp.headers.getSetCookie();
        console.log(`Login succeeded. Setting cookie: ${newCookie}`);
        cookie = newCookie;
      } else {
        throw 'Login succeeded, but no Set-Cookie header in response';
      }
    } else {
      throw `Login failed with ${resp.status} ${resp.statusText}\nResponse body: ${await resp.text()}`;
    }
  } catch (e) {
    console.log(`Something went wrong while logging in at ${SYNC_LOGIN_ENDPOINT}`);
    console.log(e);
    throw e;
  }
}
