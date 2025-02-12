// Load the size data from the JSON file
let sizeData;

// Fetch the JSON data and prevent caching issues
fetch('MQ_Sizes_Unit_Color_and_Links.json?v=' + new Date().getTime())
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        sizeData = data;
        console.log('Size data loaded successfully:', sizeData);
    })
    .catch(error => {
        document.getElementById('messageArea').innerHTML =
            '<p class="error">Failed to load size data. Please try again later.</p>';
        console.error('Error loading size data:', error);
    });

// Admin State
let isAdminVisible = false;

// Admin Key Combination Listener
window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyU') {
        toggleAdminInterface();
    }
});


// Helper: Normalize sizes based on input unit
function normalizeSizes(height, width, unit) {
    if (unit === 'Inch') return [height * 2.54, width * 2.54]; // Inches to cm
    if (unit === 'Feet') return [height * 30.48, width * 30.48]; // Feet to cm
    return [height, width]; // Already in cm
}

// Helper: Get full color name
function getColorName(colorCode) {
    switch (colorCode) {
        case 'BK':
            return 'Black';
        case 'GR':
            return 'Grey';
        case 'CR':
            return 'Cream';
        case 'WH':
            return 'White';
        default:
            return 'Unknown';
    }
}

// Helper: Find exact match
function findExactMatch(height, width, color, unit) {
    let normalizedHeight, normalizedWidth;

    if (unit === 'Feet') {
        normalizedHeight = height; // Already in feet
        normalizedWidth = width;

        // Check for exact match in Feet
        const exactMatchFeet = sizeData.find(size =>
            size['Unit'] === 'Feet' &&
            ((size['Height(H)'] === normalizedHeight && size['Width(W)'] === normalizedWidth) ||
                (size['Height(H)'] === normalizedWidth && size['Width(W)'] === normalizedHeight)) &&
            size['Color'].toUpperCase() === color
        );

        if (exactMatchFeet) {
            return {
                match: exactMatchFeet,
                note: null,
            };
        }
    }

    if (unit === 'Inch') {
        const heightFeet = height / 12;
        const widthFeet = width / 12;

        // Check for exact match in Feet for Inches input
        const exactMatchFeet = sizeData.find(size =>
            size['Unit'] === 'Feet' &&
            ((size['Height(H)'] === heightFeet && size['Width(W)'] === widthFeet) ||
                (size['Height(H)'] === widthFeet && size['Width(W)'] === heightFeet)) &&
            size['Color'].toUpperCase() === color
        );

        if (exactMatchFeet) {
            return {
                match: exactMatchFeet,
                note: `(Original: ${height} x ${width} Inches, 12 Inches = 1 Foot)`,
            };
        }
    }

    // Convert to cm and check for exact match
    const [heightCm, widthCm] = normalizeSizes(height, width, unit);
    const exactMatchCm = sizeData.find(size =>
        size['Unit'] === 'Cm' &&
        ((size['Height(H)'] === heightCm && size['Width(W)'] === widthCm) ||
            (size['Height(H)'] === widthCm && size['Width(W)'] === heightCm)) &&
        size['Color'].toUpperCase() === color
    );

    return exactMatchCm ? { match: exactMatchCm, note: null } : null;
}

// Helper: Find closest match in cm with a tolerance for slight undersizing
function findClosestMatch(height, width, color, unit) {
    const [heightCm, widthCm] = normalizeSizes(height, width, unit);
    let closestMatch = null;
    let smallestDifference = Infinity;
    const penalty = 500; // High penalty factor for significant undersizing
    const tolerance = 2.5;  // Allow 2.5 cm undersize without penalty

    const filteredData = sizeData.filter(size =>
        size['Unit'] === 'Cm' && size['Color'].toUpperCase() === color
    );

    filteredData.forEach(size => {
        // Orientation 1 (direct): Compare candidate's Height with heightCm and Width with widthCm.
        let diff1 = 0;
        // Height calculation
        if (size['Height(H)'] >= heightCm || (heightCm - size['Height(H)']) <= tolerance) {
            diff1 += Math.max(0, size['Height(H)'] - heightCm);
        } else {
            diff1 += (heightCm - size['Height(H)']) * penalty;
        }
        // Width calculation
        if (size['Width(W)'] >= widthCm || (widthCm - size['Width(W)']) <= tolerance) {
            diff1 += Math.max(0, size['Width(W)'] - widthCm);
        } else {
            diff1 += (widthCm - size['Width(W)']) * penalty;
        }

        // Orientation 2 (swapped): Compare candidate's Height with widthCm and Width with heightCm.
        let diff2 = 0;
        if (size['Height(H)'] >= widthCm || (widthCm - size['Height(H)']) <= tolerance) {
            diff2 += Math.max(0, size['Height(H)'] - widthCm);
        } else {
            diff2 += (widthCm - size['Height(H)']) * penalty;
        }
        if (size['Width(W)'] >= heightCm || (heightCm - size['Width(W)']) <= tolerance) {
            diff2 += Math.max(0, size['Width(W)'] - heightCm);
        } else {
            diff2 += (heightCm - size['Width(W)']) * penalty;
        }
        
        const difference = Math.min(diff1, diff2);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestMatch = size;
        }
    });

    return closestMatch
        ? {
              match: closestMatch,
              convertedSize: `${roundToNearestHalf(heightCm)} x ${roundToNearestHalf(widthCm)} cm`
          }
        : null;
}

// Helper: Round to nearest 0.5
function roundToNearestHalf(value) {
    return Math.round(value * 2) / 2;
}

// Helper: Format results for exact match
function formatExactMatch(i, match, originalHeight, originalWidth, unit, color) {
    const originalSize =
        unit === 'Inch'
            ? `${originalHeight} x ${originalWidth} Inches (12 Inches = 1 Foot)`
            : `${originalHeight} x ${originalWidth} ${unit}`;
    return `
        <div class="message success">
            <h3 style="font-weight: bold; color: black;">Window ${i}</h3>
            <h4>CONGRATULATIONS! YOUR EXACT SIZE IS AVAILABLE ✅</h4>
            <p>Size Needed (HxW): <strong>${originalSize}</strong></p>
            <p>Size To Order (HxW): <strong>${match['Height(H)']} x ${match['Width(W)']} ${match['Unit']}</strong></p>
            <p>Color: <strong>${getColorName(color)}</strong></p>
            <p>
                <br>
          <a href="${match['Amazon Link']}" target="_blank" style="color: green; font-weight: bold;">
        CLICK HERE: To Order Directly on Amazon
         </a>
            </p>
        </div>
    `;
}

// Helper: Format results for closest match
function formatClosestMatch(i, closestMatch, originalHeight, originalWidth, convertedSize, unit, color) {
    // Parse the converted size to extract dimensions in cm
    const [convertedHeight, convertedWidth] = convertedSize.split(' x ').map(parseFloat);

    // Check if the size exceeds maximum allowable limits with interchangeability
    const exceedsLimit =
        !(
            (convertedWidth <= 183 && convertedHeight <= 338) || // Width ≤ 183, Height ≤ 338
            (convertedWidth <= 338 && convertedHeight <= 183)    // Width ≤ 338, Height ≤ 183
        );

    if (exceedsLimit) {
        // If the size exceeds the limit, show a message without an Amazon link
        return `
            <div class="message info">
                <h3 style="font-weight: bold; color: black;">Window ${i}</h3>
                <h4>CLOSEST MATCH NOT FOUND: FREE Customization Available</h4>
                <p>Custom Size Needed (HxW): <strong>${originalHeight} x ${originalWidth} ${unit}</strong></p>
                ${
                    convertedSize
                        ? `<p>Custom Size Needed in Cm: <strong>${convertedHeight} x ${convertedWidth} Cm</strong></p>`
                        : ''
                }
                <p>Color: <strong>${getColorName(color)}</strong></p>
                <p style="font-weight: bold; color: red; margin-top: 20px;">
                    This is X-Large size. Tap the WhatsApp icon below to share your customization request with Team ArmorX. Thanks!
                </p>
            </div>
        `;
    }

    // Regular closest match recommendation
    
   // Determine if converted size is needed (only for feet or inches)
    const showConvertedSize = unit === 'Feet' || unit === 'Inch';

    return `
        <div class="message info">
            <h3 style="font-weight: bold; color: black;">Window ${i}</h3>
            <h4 style="font-weight: bold;">CLOSEST MATCH FOUND: FREE Customization Available</h4>
            
            <!-- Custom Size Needed Section -->
            <p style="margin: 0; font-size: 14px;">Custom Size Needed (HxW):</p>
            <p style="margin: 0; padding-left: 10px; font-size: 14px;">= ${originalHeight} x ${originalWidth} ${unit}</p>
            ${
                showConvertedSize
                    ? `<p style="margin: 0; padding-left: 10px; font-size: 14px;">= ${convertedSize}</p>`
                    : ''
            }
            <br> <!-- Add a line break for spacing -->

            <!-- Closest Size To Order Section -->
            <p style="margin: 0; font-size: 16px; font-weight: bold;">Closest Size To Order (HxW):</p>
            <p style="margin: 0; padding-left: 10px; font-size: 16px; font-weight: bold;">= ${closestMatch['Height(H)']} x ${closestMatch['Width(W)']} Cm</p>
            <br> <!-- Add a line break for spacing -->

            <!-- Color Section -->
            <p style="margin: 0; font-size: 14px;">Color: <strong>${getColorName(color)}</strong></p>
            
            <!-- Amazon Link -->
            <p>
                <br>
                <a href="${closestMatch['Amazon Link']}" target="_blank" style="color: blue; font-weight: bold; font-size: 14px;">
                    CLICK HERE: To Order Closest Size on Amazon
                </a>
            </p>
            
            <!-- Next Steps Section -->
            <p style="margin-top: 20px; font-weight: bold; font-size: 16px;">
    NEXT STEP:
</p>
<p style="margin: 0; font-size: 14px; font-weight: normal;">
    Tap the <img src="https://i.postimg.cc/mk19S9bF/whatsapp.png" alt="WhatsApp Icon" style="width: 18px; height: 18px; vertical-align: middle;"> WhatsApp button below to send your customization request to Team ArmorX to <strong>GET FREE customization</strong> to match your exact size.
</p>
<br>
<p style="font-size: 14px; font-weight: bold; color: #004085;">
    *CUSTOMIZATION IS ONLY POSSIBLE IF WE RECEIVE YOUR ORDER DETAILS ON
    <img src="https://i.postimg.cc/mk19S9bF/whatsapp.png" alt="WhatsApp Icon" style="width: 22px; height: 22px; vertical-align: middle;">*
</p>
        </div>
    `;
}

// Generate a WhatsApp link with customization details
function generateWhatsAppLink(orderDetails, isExceeded = false) {
    if (orderDetails.length === 0) return;

    // Check if the size exceeds the limit and customize the message
    let message;
    if (isExceeded) {
        message = `Hello Team ARMORX,\n\nMy window size exceeds the standard size limit. I need help with customization. Please assist me with the following details:\n\n${orderDetails.join('\n\n')}\n\nThank you.`;
    } else {
        message = `Hello Team ARMORX,\n\nPlease make note of my order:\n\n${orderDetails.join('\n\n')}\n\nThank you.`;
    }

    const whatsappLink = `https://wa.me/917304692553?text=${encodeURIComponent(message)}`;
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML += `
        <div style="text-align: center; margin-top: 20px;">
            <a href="${whatsappLink}" target="_blank" class="whatsapp-button">
                <span style="flex-grow: 1; text-align: left;">WHATSAPP YOUR ORDER & CUSTOMIZATION DETAILS TO TEAM ARMORX</span>
                <img src="https://i.postimg.cc/mk19S9bF/whatsapp.png" alt="WhatsApp Icon">
            </a>
        </div>
    `;
}

// Main calculation logic
function calculateSizes() {
    const unit = document.getElementById('unit').value;
    const numWindows = parseInt(document.getElementById('numWindows').value);
    const messageArea = document.getElementById('messageArea');
    let orderDetails = []; // This is your plain text details (if still needed)

    // Clear previous order data (structured orderData) and messages
    orderData = [];
    messageArea.innerHTML = '';

    for (let i = 1; i <= numWindows; i++) {
        const height = parseFloat(document.getElementById(`height${i}`).value);
        const width = parseFloat(document.getElementById(`width${i}`).value);
        const color = document.getElementById(`color${i}`).value.toUpperCase();

        if (!height || !width || height <= 0 || width <= 0) {
            messageArea.innerHTML += `<p class="error">Invalid dimensions for Window ${i}. Please enter valid values.</p>`;
            continue;
        }

        // Normalize the size to cm
        const [heightCm, widthCm] = normalizeSizes(height, width, unit);

        // Check for exact match first
        const exactMatch = findExactMatch(height, width, color, unit);
        if (exactMatch) {
            const match = exactMatch.match;
            const note = exactMatch.note || '';
            // Append plain text details as before (if needed)
            orderDetails.push(`Window ${i}: Exact Match Found: No Customization Needed\n- Size: ${match['Size(HxW)']} ${match['Unit']}\n- Color: ${getColorName(color)}\n- Link: ${match['Amazon Link']}\n${note}`);
            messageArea.innerHTML += formatExactMatch(i, match, height, width, unit, color);
            // Populate structured orderData
            orderData.push({
                windowNumber: i,
                matchType: "Exact",
                size: unit === 'Inch'
                      ? `${height} x ${width} Inches (12 Inches = 1 Foot)`
                      : `${height} x ${width} ${unit}`,
                priceRecord: match
            });
            continue; // Skip the rest for this window
        }

        // Check for dimensions exceeding limits
        const exceedsLimit =
            !(
                (widthCm <= 183 && heightCm <= 338) ||
                (widthCm <= 338 && heightCm <= 183)
            );

        if (exceedsLimit) {
            // Handle exceeded sizes (if needed, you may choose not to add to orderData)
            orderDetails.push(`Window ${i}: Size exceeds limit.\n- Custom Size: ${height} x ${width} ${unit}\n- Custom Size in Cm: ${roundToNearestHalf(heightCm)} x ${roundToNearestHalf(widthCm)} Cm\n- Color: ${getColorName(color)}`);
            messageArea.innerHTML += `
                <div class="message info">
                    <h3 style="font-weight: bold; color: black;">Window ${i}</h3>
                    <h4>SIZE LIMIT EXCEEDED: FREE Customization Available</h4>
                    <p>Custom Size Needed (HxW): <strong>${height} x ${width} ${unit}</strong></p>
                    <p>Custom Size Needed in Cm: <strong>${roundToNearestHalf(heightCm)} x ${roundToNearestHalf(widthCm)} Cm</strong></p>
                    <p>Color: <strong>${getColorName(color)}</strong></p>
                    <p style="font-weight: bold; color: red; margin-top: 20px;">
                        This size exceeds the maximum allowable dimensions. Tap the WhatsApp icon below to share your customization request with Team ArmorX. Thanks!
                    </p>
                </div>
            `;
            // Optionally, you can add a record for the exceeded size if you want it invoiced.
            continue;
        }

        // Find closest match if no exact match is found
        const closestMatch = findClosestMatch(height, width, color, unit);
        if (closestMatch) {
            const match = closestMatch.match;
            const convertedSize = closestMatch.convertedSize;
            orderDetails.push(`Window ${i}: Closest Match Found: Customization Needed\n- Custom Size Needed: ${height} x ${width} ${unit}\n- Custom Size in Cm: ${convertedSize}\n- Closest Size Ordered: ${match['Height(H)']} x ${match['Width(W)']} Cm\n- Color: ${getColorName(color)}\n- Link: ${match['Amazon Link']}`);
            messageArea.innerHTML += formatClosestMatch(i, match, height, width, convertedSize, unit, color);
            // Populate structured orderData for closest match
            orderData.push({
                windowNumber: i,
                matchType: "Closest",
                size: `${height} x ${width} ${unit}`, // Use the customer's input size here
                priceRecord: match
            });
        } else {
            messageArea.innerHTML += `<p class="error">No suitable match found for Window ${i}.</p>`;
        }
    }

    // Store the calculated details for admin access if needed (still keeping the plain text)
    calculatedOrderDetails = orderDetails;

    // Generate WhatsApp link as before
    generateWhatsAppLink(orderDetails, /* isExceeded flag if applicable */ false);
}

// Dynamic input field generation for windows
document.getElementById('numWindows').addEventListener('input', function () {
    const numWindows = parseInt(this.value);
    const windowInputsDiv = document.getElementById('windowInputs');
    const selectedUnit = document.getElementById('unit').value;

    windowInputsDiv.innerHTML = '';
    if (!isNaN(numWindows) && numWindows > 0) {
        for (let i = 1; i <= numWindows; i++) {
            windowInputsDiv.innerHTML += `
                <div class="window-input">
                    <h3>Window ${i}</h3>
                    <label for="height${i}">Enter Height:</label>
                    <input type="number" id="height${i}" placeholder="Enter Height in ${selectedUnit}">
                    <label for="width${i}">Enter Width:</label>
                    <input type="number" id="width${i}" placeholder="Enter Width in ${selectedUnit}">
                    <label for="color${i}">Select Color:</label>
                    <select id="color${i}">
                        <option value="BK">Black</option>
                        <option value="GR">Grey</option>
                        <option value="CR">Cream</option>
                        <option value="WH">White</option>
                    </select>
                </div>
            `;
        }
        windowInputsDiv.style.display = 'block';
    } else {
        windowInputsDiv.style.display = 'none';
    }
});

// Dynamic placeholder updates when the unit changes
document.getElementById('unit').addEventListener('change', function () {
    const selectedUnit = this.value;
    const numWindows = parseInt(document.getElementById('numWindows').value);
    for (let i = 1; i <= numWindows; i++) {
        const heightInput = document.getElementById(`height${i}`);
        const widthInput = document.getElementById(`width${i}`);
        if (heightInput) heightInput.placeholder = `Enter Height in ${selectedUnit}`;
        if (widthInput) widthInput.placeholder = `Enter Width in ${selectedUnit}`;
    }
});

// FAQ Toggle Logic
function toggleFaq(faqElement) {
    const answer = faqElement.nextElementSibling;
    const isExpanded = answer.style.display === "block";

    // Collapse all other FAQs
    document.querySelectorAll(".faq-answer").forEach((faq) => {
        faq.style.display = "none";
    });
    document.querySelectorAll(".arrow").forEach((arrow) => {
        arrow.textContent = "▼";
    });

    // Expand the selected FAQ if it wasn't already expanded
    if (!isExpanded) {
        answer.style.display = "block";
        faqElement.querySelector(".arrow").textContent = "▲";

        // Lazy load the video if it's not already loaded
        const iframe = answer.querySelector("iframe");
        if (iframe && !iframe.src) {
            iframe.src = iframe.getAttribute("data-src");
        }
    }
}

// Admin Panel
function toggleAdminInterface() {
    isAdminVisible = !isAdminVisible;

    let adminContainer = document.getElementById('adminContainer');
    if (!adminContainer) {
        // Create Admin Container if not exists
        adminContainer = document.createElement('div');
        adminContainer.id = 'adminContainer';
        adminContainer.className = 'admin-panel'; // Use CSS class for styling

        // Add a title
        const adminTitle = document.createElement('h3');
        adminTitle.innerText = 'Admin Panel';
        adminTitle.style.textAlign = 'center';
        adminTitle.style.color = '#333';
        adminContainer.appendChild(adminTitle);

        // Add Copy Button
        const copyButton = document.createElement('button');
        copyButton.innerText = 'Copy Text';
        copyButton.className = 'admin-button'; // Use CSS class for buttons
        copyButton.addEventListener('click', copyAdminText);
        adminContainer.appendChild(copyButton);

        // Add Format Message for WhatsApp Button
        const formatButton = document.createElement('button');
        formatButton.innerText = 'Format Message for WhatsApp';
        formatButton.className = 'admin-button'; // Use CSS class for buttons
        formatButton.addEventListener('click', formatMessageForWhatsApp);
        adminContainer.appendChild(formatButton);
        
        // Add Create Invoice Button
        const invoiceButton = document.createElement('button');
        invoiceButton.innerText = 'Create Invoice';
        invoiceButton.className = 'admin-button';
        invoiceButton.addEventListener('click', generateInvoice);
        adminContainer.appendChild(invoiceButton);

        // Add Message Display Area
        const adminMessageArea = document.createElement('div');
        adminMessageArea.id = 'adminMessageArea';
        adminMessageArea.className = 'admin-message-area'; // Use CSS class for message area
        adminContainer.appendChild(adminMessageArea);

        document.body.appendChild(adminContainer);
    }

    adminContainer.style.display = isAdminVisible ? 'block' : 'none';
}

// Function to Copy text from Admin Panel
function copyAdminText() {
    const adminMessageArea = document.getElementById('adminMessageArea');
    if (adminMessageArea) {
        const textToCopy = adminMessageArea.innerText;
        navigator.clipboard.writeText(textToCopy)
            .then(() => alert('Text copied to clipboard!'))
            .catch((err) => {
                console.error('Error copying text: ', err);
                alert('Failed to copy text. Please try again.');
            });
    }
}

// Function to Format Message for WhatsApp Admin Panel
function formatMessageForWhatsApp() {
    const adminMessageArea = document.getElementById('adminMessageArea');

    // Use the dynamically calculated orderDetails
    if (calculatedOrderDetails.length === 0) {
        adminMessageArea.innerText = 'No calculated order details available. Please run the calculator first.';
    } else {
        // Generate a simplified message format for the admin panel
        const formattedMessage = calculatedOrderDetails.map((detail) => {
            const lines = detail.split('\n');
            let windowHeader = lines[0]; // Example: "Window 1:"
            let formattedLines = [];

            // Remove unnecessary match type text after the header
            if (windowHeader.includes('Closest Match Found') || windowHeader.includes('Exact Match Found')) {
                windowHeader = windowHeader.split(':')[0] + ':';  // Keep only "Window X:"
            }

            // Process the remaining lines for closest or exact matches
            if (lines.some(line => line.includes('Closest Match Found'))) {
                const customSizeDetail = lines.find(line => line.startsWith('- Custom Size Needed'));
                const customSizeInCm = lines.find(line => line.startsWith('- Custom Size in Cm'));
                const closestSizeDetail = lines.find(line => line.startsWith('- Closest Size Ordered'));
                const colorDetail = lines.find(line => line.startsWith('- Color'));
                const linkDetail = lines.find(line => line.startsWith('- Link'));

                // Get the window quantity from the global orderData (this stores the quantity selected by admin)
                const windowNumber = parseInt(windowHeader.split(' ')[1]);
                const qtyInput = document.getElementById(`qty${windowNumber}`);
                const qty = qtyInput ? qtyInput.value : 1;

                // Replace "Closest Size Ordered" with "Closest Size to Order"
                let updatedClosestSizeDetail = closestSizeDetail ? closestSizeDetail.replace('Closest Size Ordered', 'Closest Size to Order') : null;

                formattedLines = [
                    windowHeader,
                    customSizeDetail,
                    customSizeInCm,
                    updatedClosestSizeDetail,
                    colorDetail,
                    'CLICK HERE: To Order *Closest Size* on Amazon:',
                    linkDetail,
                    `Select Qty: *${qty} qty*`  // Add the quantity selected by Admin
                ];
            } else if (lines.some(line => line.includes('Exact Match Found'))) {
                const sizeDetail = lines.find(line => line.startsWith('- Size:') || line.startsWith('- Size To Order'));
                const colorDetail = lines.find(line => line.startsWith('- Color'));
                const linkDetail = lines.find(line => line.startsWith('- Link'));
                const originalUnitNote = lines.find(line => line.includes('(Original:')); // Find the original unit note

                // Get the window quantity from the global orderData (this stores the quantity selected by admin)
                const windowNumber = parseInt(windowHeader.split(' ')[1]);
                const qtyInput = document.getElementById(`qty${windowNumber}`);
                const qty = qtyInput ? qtyInput.value : 1;

                formattedLines = [
                    windowHeader,
                    originalUnitNote, // Include the original unit note, if available
                    sizeDetail,
                    colorDetail,
                    'CLICK HERE: To Order *Exact Size* on Amazon:',
                    linkDetail,
                    `Select Qty: *${qty} qty*`  // Add the quantity selected by Admin
                ];
            }

            return formattedLines.filter(Boolean).join('\n');
        }).join('\n\n');

        // Display the formatted message in the admin area
        adminMessageArea.innerText = formattedMessage;
    }
}

// Global variable holding structured order data (populate this in your calculateSizes logic)
let orderData = [];

// --- ADMIN PANEL: Invoice Generation Functions (Updated GUI with Quantity) ---

// Function to create (or update) the invoice controls panel
function generateInvoice() {
  if (!orderData || orderData.length === 0) {
    alert("No order details found. Please run the calculator first.");
    return;
  }

  const adminMessageArea = document.getElementById('adminMessageArea');
  if (!adminMessageArea) return;

  // Check if an invoice controls container already exists
  let invoiceContainer = document.getElementById('invoiceControls');
  if (!invoiceContainer) {
    invoiceContainer = document.createElement('div');
    invoiceContainer.id = 'invoiceControls';
    // Arrange controls vertically with a gap
    invoiceContainer.style.display = 'flex';
    invoiceContainer.style.flexDirection = 'column';
    invoiceContainer.style.gap = '10px';
    invoiceContainer.style.marginBottom = '20px';
    adminMessageArea.appendChild(invoiceContainer);
  } else {
    // Clear existing controls to rebuild them
    invoiceContainer.innerHTML = '';
  }

  // Create Price Type Dropdown (placed on top)
  const priceSelection = document.createElement('select');
  priceSelection.id = 'priceSelection';
  priceSelection.innerHTML = ` 
    <option value="Selling Price">Selling Price</option>
    <option value="Deal Price">Deal Price</option>
    <option value="Event Price">Event Price</option>
  `;
  invoiceContainer.appendChild(priceSelection);

  // Create Discount Input Field (placed below the dropdown)
  const discountInput = document.createElement('input');
  discountInput.type = 'number';
  discountInput.id = 'discountInput';
  discountInput.placeholder = 'Enter Discount %';
  discountInput.min = '0';
  discountInput.max = '100';
  invoiceContainer.appendChild(discountInput);

  // Create a container for the Quantity fields (one per window)
  let qtyContainer = document.createElement('div');
  qtyContainer.id = 'qtyContainer';
  qtyContainer.style.display = 'flex';
  qtyContainer.style.flexDirection = 'column';
  qtyContainer.style.gap = '5px';
  qtyContainer.style.marginBottom = '10px';

  // For each window in orderData, add a quantity input (default = 1)
  orderData.forEach((item) => {
    let qtyDiv = document.createElement('div');
    qtyDiv.innerHTML = `Window ${item.windowNumber} Quantity: <input type="number" id="qty${item.windowNumber}" value="1" min="1" style="width:50px;">`;
    qtyContainer.appendChild(qtyDiv);
  });
  invoiceContainer.appendChild(qtyContainer);

  // Create Generate Invoice Button (placed at the bottom)
  const generateBtn = document.createElement('button');
  generateBtn.className = 'admin-button';
  generateBtn.innerText = 'Generate Invoice';
  generateBtn.addEventListener('click', () => {
    // Remove any previous invoice display
    const existingInvoice = document.getElementById('invoiceDisplay');
    if (existingInvoice) {
      existingInvoice.remove();
    }
    // Generate and display the invoice using the current selections
    displayInvoice(priceSelection.value, discountInput.value);
  });
  invoiceContainer.appendChild(generateBtn);
}

// Function to calculate and display the invoice with integer totals
function displayInvoice(priceType, discountPercent) {
  let invoiceData = [];
  let totalAmount = 0;

  // Iterate over each net order stored in the global orderData array
  orderData.forEach(item => {
    // Retrieve the quantity from the corresponding input field (default to 1 if missing)
    let qtyInput = document.getElementById(`qty${item.windowNumber}`);
    let qty = qtyInput ? parseInt(qtyInput.value) : 1;
    // Retrieve the price from the JSON record using the selected price type
    const price = parseFloat(item.priceRecord[priceType]);
    const windowTotal = price * qty;
    totalAmount += windowTotal;
    // Format the invoice line for this window, rounding all numbers to the nearest integer
    invoiceData.push(
      `Window ${item.windowNumber}\nSize: ${item.size}\nQuantity: ${qty}\nPrice: INR ${Math.round(price)}/- x ${qty} = INR ${Math.round(windowTotal)}/-`
    );
  });

  // Compute discount and final total, then round them to integers
  const discountAmount = (totalAmount * parseFloat(discountPercent || 0)) / 100;
  const finalAmount = totalAmount - discountAmount;

  let invoiceMessage = `<b>Invoice:</b>\n${invoiceData.join('\n\n')}\n\n<b>Total:</b> INR ${Math.round(totalAmount)}/-`;
  if (discountAmount > 0) {
    invoiceMessage += `\n<b>Discount (${discountPercent}%):</b> - INR ${Math.round(discountAmount)}/-`;
  }
  invoiceMessage += `\n<b>Final Total:</b> INR ${Math.round(finalAmount)}/-`;

  // Create a container for the invoice display and append it to the admin panel
  const invoiceDisplay = document.createElement('div');
  invoiceDisplay.id = 'invoiceDisplay';
  invoiceDisplay.style.marginTop = '20px';
  invoiceDisplay.innerHTML = `<pre>${invoiceMessage}</pre>`;

  const adminMessageArea = document.getElementById('adminMessageArea');
  adminMessageArea.appendChild(invoiceDisplay);
}

// Share Functionality
document.getElementById('shareButton').addEventListener('click', function () {
    const shareData = {
        title: 'ArmorX Window Mosquito Net Calculator',
        text: "Hey look what I found! Try out this amazing ArmorX calculator to get a perfect customize fit *Window Mosquito Net* protection for your home. It's so easy to use! Check it out yourself.",
        url: 'https://armorx-net.github.io/ArmorX-Mosquito-Net-Calculator/'
    };

    // Check if Web Share API is supported
    if (navigator.share) {
        navigator
            .share(shareData)
            .then(() => console.log('Shared successfully'))
            .catch((err) => console.error('Error sharing:', err));
    } else {
        // Fallback: Copy to clipboard for unsupported browsers
        navigator.clipboard
            .writeText(`${shareData.text} ${shareData.url}`)
            .then(() => alert('Link copied to clipboard! Share it manually.'))
            .catch((err) => console.error('Error copying link:', err));
    }
});
