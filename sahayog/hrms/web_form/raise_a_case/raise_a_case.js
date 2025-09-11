frappe.ready(function() {
   
    // Intro message for the form (shown to everyone)
    let intro = document.createElement('div');
    intro.className = "alert alert-info";
    intro.innerHTML = "Please fill all details carefully. Attach supporting documents if any.";
    document.querySelector(".form-page").prepend(intro); // adds to top of form
});