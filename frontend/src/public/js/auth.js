const btn = document.getElementById('btn');
const containerForm = document.querySelector('.auth-form-container');


btn.addEventListener('click', () => {
    containerForm.classList.toggle('tooggle');

});