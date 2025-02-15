let otpTimerInterval;
let timer = 60; // Timer duration in seconds

// Function to update the timer color
function updateTimerColor(percentage) {
  const timerElement = document.getElementById('otpTimer');
  if (percentage > 50) {
    timerElement.style.color = '#28a745'; // Green
  } else if (percentage > 25) {
    timerElement.style.color = '#ffc107'; // Yellow
  } else {
    timerElement.style.color = '#dc3545'; // Red
  }
}

// Function to start the OTP timer
function startOtpTimer() {
  const timerElement = document.getElementById('otpTimer');
  otpTimerInterval = setInterval(function () {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerElement.textContent = `OTP expires in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    const percentage = (timer / 60) * 100;
    updateTimerColor(percentage);

    if (--timer < 0) {
      clearInterval(otpTimerInterval);
      timerElement.textContent = 'OTP expired';
      timerElement.style.color = 'red';
    }
  }, 1000);
}

// Function to initialize and reset the OTP timer
function initializeOtpTimer() {
  clearInterval(otpTimerInterval); // Clear any existing timer
  timer = 60; // Reset timer duration
  startOtpTimer();
}

// Start the timer on page load
initializeOtpTimer();

function validateOtpForm() {
  const otpInput = document.getElementById('otp').value;
  $.ajax({
    type:'post',
    url:'/verify-changepassword-otp',
    data:{otp:otpInput},
    success:function(response){
      if(response.success){
        Swal.fire({
          icon:'success',
          title:'OTP Verified successfully',
          showConfirmButton:false,
          timer:1500
        }).then(()=>{
          window.location.href = response.redirectURL;
        })
      }else{
        Swal.fire({
          icon:'error',
          title:'Invalid OTP',
          text:response.message
        })
      }
    },
    error:function(){
      Swal.fire({
        icon:'error',
        title:'Error ',
        text:'Failed to verify OTP. Please try again.'
      })
    }
  })
  return false;
}

function resendOTP() {
  clearInterval(otpTimerInterval);
  timer=60;
  startOtpTimer();
  $.ajax({
    type:'post',
    url:'/resend-forgot-otp',
    success: function(response){
      if(response.success){
        Swal.fire({
          icon:'success',
          title:'Resend OTP successfull',
          showConfirmButton:false,
          timer:1500
        })
      }else{
        Swal.fire({
        icon:'error',
        title:'Error ',
        text:'Failed to resend OTP. Please try again.'
      })
      }
    },
    error: function() {
      Swal.fire({
        icon:'error',
        title:'Error ',
        text:'Failed to verify OTP. Please try again.'
      })
    }
  })
}