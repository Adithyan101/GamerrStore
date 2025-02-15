
$(document).ready(function () {
    // Handle Edit Address click event
    $('.edit-address').on('click', function () {
        const addressData = $(this).data('address');

        // Populate the modal with the address data
        $('#editName').val(addressData.name);
        $('#editPhone').val(addressData.phone);
        $('#editCity').val(addressData.city);
        $('#editLandmark').val(addressData.landMark);
        $('#editState').val(addressData.state);
        $('#editPincode').val(addressData.pincode);

        // Store the address ID for the form submission
        $('#editAddressId').val(addressData._id);
    });

    // Handle Save Changes button in Edit Address Modal
    $('#saveChangesBtn').on('click', function () {
        const updatedAddress = {
            name: $('#editName').val(),
            phone: $('#editPhone').val(),
            city: $('#editCity').val(),
            landMark: $('#editLandmark').val(),
            state: $('#editState').val(),
            pincode: $('#editPincode').val(),
        };

        const addressId = $('#editAddressId').val();

        // Send the updated address to the backend via an AJAX request
        $.ajax({
            url: '/CheckoutEditAddress', // Backend route to handle address update
            method: 'POST',
            data: {
                addressId: addressId,
                ...updatedAddress
            },
            success: function (response) {
                if (response.success) {
                    // Update the address in the DOM
                    const addressCard = $(`input[value="${addressId}"]`).closest('.Shipping-Info');
                    addressCard.find('p:contains("Name:")').html(`<strong>Name:</strong> ${updatedAddress.name}`);
                    addressCard.find('p:contains("Phone:")').html(`<strong>Phone:</strong> ${updatedAddress.phone}`);
                    addressCard.find('p:contains("City:")').html(`<strong>City:</strong> ${updatedAddress.city}`);
                    addressCard.find('p:contains("Landmark:")').html(`<strong>Landmark:</strong> ${updatedAddress.landMark}`);
                    addressCard.find('p:contains("State:")').html(`<strong>State:</strong> ${updatedAddress.state}`);
                    addressCard.find('p:contains("Pincode:")').html(`<strong>Pincode:</strong> ${updatedAddress.pincode}`);

                    // Close the modal and show a success message
                    $('#editAddressModal').modal('hide');
                    alert('Address updated successfully!');
                } else {
                    alert('Failed to update address: ' + response.message);
                }
            },
            error: function (error) {
                console.error('Error updating address:', error);
                alert('Error updating address.');
            }
        });
    });
});

    
// Handle Add Address button click
document.getElementById('addAddressBtn').addEventListener('click', async (e) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Get the form data
    const addressData = {
        name: document.getElementById('addName').value,
        phone: document.getElementById('addPhone').value,
        city: document.getElementById('addCity').value,
        landMark: document.getElementById('addLandmark').value,
        state: document.getElementById('addState').value,
        pincode: document.getElementById('addPincode').value,
    };

    try {
        const response = await fetch('/add-checkout-address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData),
        });

        const result = await response.json();

        if (result.success) {
            // Address added successfully, close the modal
            $('#addAddressModal').modal('hide');

            // Optionally, refresh the address list or show success message
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Address added successfully!',
            }).then(() => {
                // After Swal success message closes, navigate to the checkout page
                window.location.href = '/checkout';
            });
            // You can also update the address list here if necessary
            // Example: updateAddressList(result.userAddress);
        } else {
            alert(result.message || 'Error adding address');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding address');
    }
});


//razopray:

document.getElementById("placeOrderBtn").addEventListener("click", async function () {

    const selectedAddress = document.querySelector('input[name="selectedAddress"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    console.log("paymentMethod", paymentMethod);
    
    // console.log(selectedAddress, paymentMethod);

    // const totalPrice = parseFloat(document.getElementById('totalPrice').textContent.replace('₹', ''));
    // console.log("totalPrice", totalPrice);


    const response = await fetch('/placeOrder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedAddress, paymentMethod }),

    });

    const result = await response.json();
    console.log("result", result);
    

    if (result.paymentMethod === "Online Payment") {

        const options = {
            key: result.razorpayKey,
            amount: result.razorpayOrder.amount, // Convert to paise
            currency: 'INR',
            order_id: result.razorpayOrder.id,
            name: "Gamerr E-Commerce",
            description: "Order Payment",
            callback_url: '/orderConfirmation',

            prefill: {
                name: "<%= user.name %>",
                email: "<%= user.email %>",
                contact: "<%= user.phone %>"
            },
            theme: {
                color: "#000000"
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    } else if (result.success && result.paymentMethod === "COD") {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Order placed successfully!',
        })
        window.location.href = `/orderSuccess?orderId=${result.orderId}`;
    }else if( result.paymentMethod === "Wallet"){
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Order placed successfully!',
        })
        window.location.href = `/orderSuccess?orderId=${result.orderId}`;
    }

    else {

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
        })
        console.log("Failed to place order. Response:", result);

    }
});


//coupons:
$(document).ready(function () {
    // Highlight selected coupon
    $('.list-group-item-action').on('click', function () {
        $('.list-group-item-action').removeClass('active'); // Remove active class from all buttons
        $(this).addClass('active'); // Add active class to the selected button

        // Extract coupon details
        const couponCode = $(this).data('coupon-code');
        const couponId = $(this).data('coupon-id');
        const couponPrice = $(this).data('coupon-price');
        const minPrice = $(this).data('coupon-min-price');

        // Set the coupon code in the input field
        $('#couponCode').val(couponCode);

        console.log("Selected Coupon:", { couponCode, couponId, couponPrice, minPrice });
    });

    // Handle coupon application
    $('#applyCouponBtn').on('click', function () {
        const couponCode = $('#couponCode').val();
        console.log("hello");

        if (couponCode) {
            // Apply coupon via AJAX
            $.ajax({
                type: "POST",
                url: "/applyCoupon",
                contentType: "application/json",
                data: JSON.stringify({ couponCode: couponCode }),
                success: function (response) {
                    console.log("Response:", response);
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'Coupon applied successfully!',
                        });

                        // Update UI with discount and total price
                        $('#discountAmount').text(`₹${response.discount || 0}`);
                        $('#totalPrice').text(`₹${response.discountedPrice}`); // Update cart total
                        $('#couponsApplied').text(response.couponName || 1); // Update applied coupon name
                        $('#applyCouponBtn').hide(); // Hide Apply button after success
                        $('#removeCouponBtn').show(); // Show Remove button

                        $('#couponModal').modal('hide'); // Close the modal
                    } else {
                        $('#couponErrorMessage').text(response.message).show(); // Show error message
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error("AJAX Error:", textStatus, errorThrown);
                    $('#couponErrorMessage')
                        .text(`Error: ${jqXHR.responseJSON?.message || "Failed to apply coupon. Please try again."}`)
                        .show();
                }
            });
        } else {
            $('#couponErrorMessage').text("Please select a coupon or enter a code.").show();
        }
    });


    // Handle coupon removal
    $('#removeCouponBtn').on('click', function () {
        // Send a request to remove the applied coupon
        $.ajax({
            type: "POST",
            url: "/removeCoupon",
            success: function (response) {
                // Update UI to reflect the coupon removal
                const originalPrice = response.originalPrice; // Get the original price from the server
                $('#discountAmount').text('₹0.00');
                $('#totalPrice').text(`₹${originalPrice}`); // Update the total price
                $('#couponsApplied').text('0');
                $('#applyCouponBtn').show(); // Show Apply button again
                $('#removeCouponBtn').hide(); // Hide Remove button

                // Update Razorpay amount to the original price (in paise)
                updatedAmount = originalPrice * 100; // Convert to paise

                Swal.fire({
                    icon: 'info',
                    title: 'Coupon Removed',
                    text: 'Coupon has been removed from your cart.',
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("AJAX Error:", textStatus, errorThrown);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to remove the coupon. Please try again.',
                });
            }
        });
    });

});



