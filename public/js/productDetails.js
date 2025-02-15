document.getElementById('addToCart').addEventListener('click', () => {

  const quantity =  document.getElementById('quantity').value
  const productId = document.getElementById('addToCart').getAttribute('productId')
  
  addToCart(productId,quantity);

})


async function addToCart(productId, quantity) {

   const response = await fetch(`/addToCart/?productId=${productId}&quantity=${quantity}`,{
        method:"GET",
        headers: {
            'Content-Type': 'application/json',
        }    
    })
    const result = await response.json();
    if( response.ok){
       
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Product added successfully!',
        }).then(() => {
            window.location.reload();
        })
       

    }else{
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message||'Product Failed to add ',
        })
    }

}