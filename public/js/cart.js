//confirm before removing the item from cart
const removeBtn = document.querySelectorAll('.removeBtn');

removeBtn.forEach((ele) => {
  ele.addEventListener('click', removeItem)
})

async function removeItem(event) {

  event.preventDefault();

  await Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, Remove it!"

  }).then(async (result) => {

    if (result.isConfirmed) {
      await Swal.fire({
        title: "Item Removed!",
        text: "Cart Item Removed Sucessfully",
        icon: "success"
      });

      window.location.href = event.target.closest('a').href;

    }

  });

};

document.querySelectorAll('.quantity-box').forEach((input) => {
    input.addEventListener('change', (event) => {
        const productId = event.target.getAttribute('data-product-id');
        const maxStock = parseInt(event.target.getAttribute('data-stock'), 10);
        const newQuantity = parseInt(event.target.value);

        // Check if the quantity exceeds stock
        if (newQuantity > maxStock) {
            Swal.fire({
                icon: "error",
                title: "Stock Limit Exceeded",
                text: `Only ${maxStock} items available.`,
            });
            event.target.value = maxStock; // Reset to max stock
            return;
        }

      // Send AJAX request to update quantity
      fetch('/cartQtyChange', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, quantity: newQuantity }),
      })
          .then((response) => response.json())
          .then((data) => {
              if (data.message === 'Cart updated successfully') {
                  Swal.fire({
                      icon: "success",
                      title: "Quantity Updated",
                      text: "The quantity has been updated successfully.",
                  }).then(() => {
                      // Reload the page after the user closes the alert
                      location.reload();
                  });
              } else {
                  Swal.fire({
                      icon: "error",
                      title: "Error Updating Quantity",
                      text: data.message||"There was an error updating the quantity.",
                  });
              }
          })
          .catch((error) => {
              console.error('Error updating quantity:', error);
          });
  });
});

$(document).on("change", ".quantity-input", function () {
  const productId = $(this).data("product-id");
  const quantity = $(this).val();

  if (quantity <= 0) {
      alert("Quantity should be greater than zero!");
      return;
  }

  $.ajax({
      url: "/updateCartQuantity",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ productId, quantity }),
      success: function (response) {
          // Update the product total price
          $(`#product-total-price-${productId}`).text(response.updatedProduct.totalPrice);

          // Update the total cart price
          updateTotalCartPrice();
      },
      error: function (xhr, status, error) {
          console.error("Error updating cart:", error);
      }
  });
});

function updateTotalCartPrice() {
  let total = 0;

  $(".product-total-price").each(function () {
      total += parseFloat($(this).text());
  });

  $("#totalCartPrice").text(total.toFixed(2));
}



$(document).ready(function () {
  // When the page loads, make an AJAX call to check for blocked products
  $.ajax({
      url: '/getCart',  // Endpoint to get cart and remove blocked products
      method: 'GET',
      success: function (response) {
          if (response.products) {
              // Update the cart display with the remaining products and total price
              updateCartDisplay(response.products, response.totalCartPrice);
          }
      },
      error: function ( error) {
          console.error("Error fetching cart data:", error);
      }
  });

  // Function to update the cart display dynamically
  function updateCartDisplay(products, totalCartPrice) {
      let cartContent = '';
      if (products.length > 0) {
          products.forEach(product => {
              cartContent += `
                  <tr>
                      <td>${product.productId.productName}</td>
                      <td>${product.quantity}</td>
                      <td>${product.totalPrice}</td>
                  </tr>
              `;
          });
      } else {
          cartContent = '<tr><td colspan="3">Your cart is empty.</td></tr>';
      }

      // Insert the updated content into the cart table
      $('.cart-table tbody').html(cartContent);

      // Update the total price
      $('#totalCartPrice').text(totalCartPrice.toFixed(2));
  }
});

//remove bttn toast
    $(document).ready(function () {
        $('.remove-btn').on('click', function (e) {
            e.preventDefault(); // Prevent default button action
            const productId = $(this).data('id'); // Get product ID

            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to remove this item from your cart?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, remove it!',
                cancelButtonText: 'Cancel',
            }).then((result) => {
                if (result.isConfirmed) {
                    // Redirect to remove route
                    window.location.href = `/removeCartItem?id=${productId}`;
                }
            });
        });
    });



