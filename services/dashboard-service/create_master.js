const createUser = async () => {
    try {
        const response = await fetch('http://localhost:5001/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'master',
                email: 'master@example.com',
                password: 'master123',
                role: 'master'
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Master User created:', data);
        } else {
            console.error('Error:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
};

createUser();
