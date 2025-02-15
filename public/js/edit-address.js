document.getElementById('submitButton').addEventListener('click', function (event) {
    if (!validateForm()) {
        event.preventDefault();
    }
});

function validateForm() {
    const requiredFields = [
        { id: "addressType", label: "Address Type" },
        { id: "name", label: "Name" },
        { id: "city", label: "City" },
        { id: "landMark", label: "Landmark" },
        { id: "state", label: "State" },
        { id: "pincode", label: "Pincode" },
        { id: "phone", label: "Phone" },
    ];

    for (const field of requiredFields) {
        const input = document.getElementById(field.id);
        if (!input || input.value.trim() === "") {
            Swal.fire({
                title: 'Error',
                text: `Please fill in the ${field.label} field. It cannot be empty or just spaces.`,
                icon: 'error'
            });
            return false;
        }

        // Additional validation for numeric fields
        if (field.id === "pincode" || field.id === "phone") {
            if (isNaN(input.value.trim()) || input.value.trim().length < 6) {
                Swal.fire({
                    title: 'Error',
                    text: `${field.label} must be a valid number with a minimum length of 6 digits.`,
                    icon: 'error'
                });
                return false;
            }
        }
    }

    return true;
}