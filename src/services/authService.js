import mockApi from '../api/mockApi';


export async function login(email, password) {
return mockApi.login(email, password);
}
export async function register(name, email, password, consent) {
return mockApi.register(name, email, password, consent);
}
export async function logout() {
return mockApi.logout();
}
export async function getMe(userId) {
return mockApi.getMe(userId);
}