import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

export const perPage = 100;

export default {
  getStarredRepos(username, page = 1) {
    return apiClient.get(`/users/${username}/starred`, {
      params: {
        page,
        per_page: perPage,
      },
    });
  },
  getUser(username) {
    return apiClient.get(`/users/${username}`);
  },
};