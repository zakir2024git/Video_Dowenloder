/*******************************
 * Configuration for Colors
 *******************************/
const formatColors = {
    greenFormats: ["17", "18", "22"],
    blueFormats: ["139", "140", "141", "249", "250", "251", "599", "600"],
    defaultColor: "#9e0cf2"
};

/*******************************
 * Utility Functions
 *******************************/

/**
 * Get the background color based on the format itag.
 * @param {string} downloadUrlItag - The itag parameter from the download URL.
 * @returns {string} - The corresponding background color.
 */
function getBackgroundColor(downloadUrlItag) {
    if (formatColors.greenFormats.includes(downloadUrlItag)) {
        return "green";
    } else if (formatColors.blueFormats.includes(downloadUrlItag)) {
        return "#3800ff";
    } else {
        return formatColors.defaultColor;
    }
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Extract YouTube video ID from a given URL.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} - The video ID or null if not found.
 */
// Function to get YouTube video IDs from a URL, including Shorts URLs
function getYouTubeVideoIds(url) {
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:shorts\/|[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
}

/**
 * Sanitize HTML content using DOMPurify.
 * @param {string} content - The HTML content to sanitize.
 * @returns {string} - The sanitized HTML.
 */
function sanitizeContent(content) {
    return DOMPurify.sanitize(content);
}

/**
 * Update the inner HTML of a specified element with sanitized content.
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} content - The content to inject.
 */
function updateElement(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    } else {
        console.warn(`Element with ID "${elementId}" not found.`);
    }
}

/**
 * Retrieve a query parameter value by name from a URL.
 * @param {string} name - The name of the parameter.
 * @param {string} url - The URL to extract the parameter from.
 * @returns {string} - The parameter value or an empty string if not found.
 */
function getParameterByName(name, url) {
    // Properly escape regex special characters
    name = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
    const results = regex.exec(url);
    
    if (!results) return '';
    if (!results[2]) return '';
    
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/*******************************
 * AJAX Request with Retry Logic
 *******************************/

/**
 * Make an AJAX GET request with retry capability.
 * @param {string} inputUrl - The input URL for the request.
 * @param {number} retries - Number of retry attempts remaining.
 */
function makeRequest(inputUrl, retries = 4) {
    const requestUrl = `https://vkrdownloader.xyz/server?api_key=vkrdownloader&vkr=${encodeURIComponent(inputUrl)}`;
    
    $.ajax({
        url: requestUrl,
        type: "GET",
        cache: true,
        async: true,
        crossDomain: true,
        dataType: 'json', // Assuming server supports CORS
        timeout: 10000, // Set a timeout for the request
        success: function (data) {
            handleSuccessResponse(data, inputUrl);
        },
        error: function(xhr, status, error) {
            if (retries > 0) {
                console.log(`Retrying... (${retries} attempts left)`);
                setTimeout(() => makeRequest(inputUrl, retries - 1), 2000); // Adding a delay before retrying
            } else {
                const errorMessage = getErrorMessage(xhr, status, error);
                console.error(`Error Details: ${errorMessage}`);
                displayError("Unable to fetch the download link after several attempts. Please check the URL or try again later.");
                document.getElementById("loading").style.display = "none";
            }
        },
        complete: function () {
            document.getElementById("downloadBtn").disabled = false; // Re-enable the button
        }
    });
}

/**
 * Generate a detailed error message based on the XHR response.
 * @param {Object} xhr - The XMLHttpRequest object.
 * @param {string} status - The status string.
 * @param {string} error - The error message.
 * @returns {string} - The formatted error message.
 */
function getErrorMessage(xhr, status, error) {
    let message = `Status: ${status}, Error: ${error}`;
    
    if (xhr.status) {
        message += `, XHR Status: ${xhr.status}`;
    }
    
    if (xhr.responseText) {
        const response = JSON.parse(xhr.responseText);
        if (response && response.error) {
            message += `, Server Error: ${response.error}`;
        }
    }
    
    return message;
}

/*******************************
 * Event Handlers
 *******************************/

/**
 * Handle the "Download" button click event.
 */
document.getElementById("downloadBtn").addEventListener("click", debounce(function () {
    document.getElementById("loading").style.display = "initial";
    document.getElementById("downloadBtn").disabled = true; // Disable the button

    const inputUrl = document.getElementById("inputUrl").value.trim();
    if (!inputUrl) {
        displayError("Please enter a valid YouTube URL.");
        document.getElementById("loading").style.display = "none";
        document.getElementById("downloadBtn").disabled = false;
        return;
    }

    makeRequest(inputUrl); // Make the AJAX request with retry logic
}, 300));  // Adjust the delay as needed

/**
 * Display an error message within the page instead of using alert.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
    const errorContainer = document.getElementById("error");
    if (errorContainer) {
        errorContainer.innerHTML = sanitizeContent(message);
        errorContainer.style.display = "block";
    } else {
        // Fallback to alert if error container is not available
        alert(message);
    }
}

/*******************************
 * Response Handlers
 *******************************/

/**
 * Handle successful AJAX responses.
 * @param {Object} data - The response data from the server.
 * @param {string} inputUrl - The original input URL.
 */
function handleSuccessResponse(data, inputUrl) {
    document.getElementById("container").style.display = "block";
    document.getElementById("loading").style.display = "none";

    if (data.data) {
        const videoData = data.data;

        // Extract necessary data
        const thumbnailUrl = videoData.thumbnail;
        const downloadUrls = videoData.downloads.map(download => download.url);
        const videoSource = videoData.source;
        const videoId = getYouTubeVideoIds(videoSource);

        // Construct video HTML
        const videoHtml = `
            <video style='background: black url(${thumbnailUrl}) center center/cover no-repeat; width:100%; height:500px; border-radius:20px;' 
                   poster='${thumbnailUrl}' autoplay controls playsinline>
                <source src='https://inv.nadeko.net/latest_version?id=${videoId}&itag=18&local=true' type='video/mp4'>
                <source src='https://vkrcors.vercel.app/proxy?url=https://invidious.jing.rocks/latest_version?id=${videoId}&itag=18&local=true' type='video/mp4'>
                ${downloadUrls.map(url => `<source src='${url}' type='video/mp4'>`).join('')}
            </video>`;
        const titleHtml = videoData.title ? `<h3>${sanitizeContent(videoData.title)}</h3>` : "";
        const descriptionHtml = videoData.description ? `<h4><details><summary>View Description</summary>${sanitizeContent(videoData.description)}</details></h4>` : "";
        const durationHtml = videoData.size ? `<h5>${sanitizeContent(videoData.size)}</h5>` : "";

        // Update DOM elements
        updateElement("thumb", videoHtml);
        updateElement("title", titleHtml);
        updateElement("description", descriptionHtml);
        updateElement("duration", durationHtml);

        // Generate download buttons
        generateDownloadButtons(data, inputUrl);
    } else {
        displayError("Issue: Unable to retrieve the download link. Please check the URL and contact us on Social Media @TheOfficialVKr.");
        document.getElementById("loading").style.display = "none";
    }
}

/**
 * Generate download buttons with dynamic colors and labels.
 * @param {Object} videoData - The video data from the server.
 * @param {string} inputUrl - The original input URL.
 */
function generateDownloadButtons(videoData, inputUrl) {
    const downloadContainer = document.getElementById("download");
    downloadContainer.innerHTML = "";

    if (videoData.data) {
        const downloads = videoData.data.downloads;
        const videoSource = videoData.data.source;

        // Add YouTube specific button if applicable
        const videoId = getYouTubeVideoIds(videoSource);
        if (videoId) {
            downloadContainer.innerHTML += `
                <a href='https://inv.nadeko.net/latest_version?id=${videoId}&itag=18&local=true' target='_blank' rel='noopener noreferrer'>
                    <button class='dlbtns' style='background: green'>Download Video (YouTube)</button>
                </a>`;
        }

        // Generate download buttons for available formats
        downloads.forEach(download => {
            if (download && download.url) {
                const downloadUrl = download.url;
                const itag = getParameterByName("itag", downloadUrl);
                const bgColor = getBackgroundColor(itag);
                const videoExt = download.format_id;
                const videoSize = download.size;

                downloadContainer.innerHTML += `
                    <a href='${downloadUrl}' target='_blank' rel='noopener noreferrer'>
                        <button class='dlbtns' style='background:${bgColor}'>
                            ${sanitizeContent(videoExt)} - ${sanitizeContent(videoSize)}
                        </button>
                    </a>`;
            }
        });

        // Add iframes for additional download options, only if YouTube video source
        if (videoId) {
            const qualities = ["mp3", "360", "720", "1080"];
            qualities.forEach(quality => {
                downloadContainer.innerHTML += `
                    <iframe 
                        style='border:0;outline:none;width:100%;max-height:45px;height:45px !important; margin-top: 10px;' 
                        src='https://vkrdownloader.xyz/server/dlbtn.php?q=${encodeURIComponent(quality)}&vkr=${encodeURIComponent(videoSource)}' 
                        title='Download ${quality}' 
                        sandbox='allow-scripts allow-same-origin'>
                    </iframe>`;
            });
        }
    } else {
        displayError("No download links found or data structure is incorrect.");
        document.getElementById("loading").style.display = "none";
    }

    // If no download buttons or iframes were added, notify the user
    if (downloadContainer.innerHTML.trim() === "") {
        displayError("Server Down due to Too Many Requests. Please contact us on Social Media @TheOfficialVKr.");
        document.getElementById("container").style.display = "none";
        // Redirecting the user to an alternative download page
        window.location.href = `https://vkrdownloader.xyz/download.php?vkr=${encodeURIComponent(inputUrl)}`;
    }
}
