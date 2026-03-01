import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'topics',
      component: () => import('@/views/TopicList.vue'),
      meta: { title: 'Topics' },
    },
    {
      path: '/type/:typeId/topic/:topicId',
      name: 'flashcard',
      component: () => import('@/views/Flashcard.vue'),
      meta: { title: 'Flashcards' },
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/views/Review.vue'),
      meta: { title: 'Words to learn' },
    },
  ],
})

router.afterEach((to) => {
  const title = (to.meta?.title as string) ?? 'Easy Vocab'
  document.title = `${title} | Easy Vocab`
})

export default router
