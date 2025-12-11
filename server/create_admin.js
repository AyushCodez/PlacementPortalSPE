const createUser = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin'
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('User created:', data);
        } else {
            console.error('Error:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
};

createUser();
