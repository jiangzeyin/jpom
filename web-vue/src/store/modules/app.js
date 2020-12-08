/**
 * 应用相关的 store
 */
import {
  ACTIVE_TAB_KEY,
  TAB_LIST_KEY
} from '../../utils/const'

const app = {
  state: {
    activeTabKey: localStorage.getItem(ACTIVE_TAB_KEY),
    tabList: JSON.parse(localStorage.getItem(TAB_LIST_KEY))
  },
  mutations: {
    setActiveTabKey(state, activeKey) {
      state.activeTabKey = activeKey;
    },
    setTabList(state, tabList) {
      state.tabList = tabList;
    }
  },
  actions: {
    // 添加 tab
    addTab({commit, state, rootGetters}, tab) {
      return new Promise((resolve) => {
        // 从 store 里面拿到 menus 匹配 path 得到当前的菜单，设置 tab 的标题
        const menus = rootGetters.getMenus;
        let currentMenu = {};
        menus.forEach(menu => {
          menu.childs.forEach(subMenu => {
            if (subMenu.path === tab.path) {
              currentMenu = subMenu;
            }
          })
        });
        tab.title = currentMenu.title;
        let tabList = state.tabList || [];
        // 获取下标 -1 表示可以添加 否则就是已经存在
        const index = tabList.findIndex(ele => ele.key === tab.key);
        if (index > -1) {
          // 设置 activeTabKey
          commit('setActiveTabKey', tab.key);
          localStorage.setItem(ACTIVE_TAB_KEY, tab.key);
        } else {
          // 新增
          tabList.push(tab);
          commit('setTabList', tabList);
          commit('setActiveTabKey', tab.key);
          localStorage.setItem(ACTIVE_TAB_KEY, tab.key);
          localStorage.setItem(TAB_LIST_KEY, JSON.stringify(tabList));
        }
        resolve()
      })
    },
    // 删除 tab
    removeTab({commit, state}, key) {
      return new Promise((resolve) => {
        let tabList = state.tabList;
        const index = tabList.findIndex(ele => ele.key === key);
        tabList.splice(index, 1);
        // 如果删除的是 activeTabKey
        if (state.activeTabKey === key) {
          // 寻找下一个
          const tempTab = tabList[Math.min(index, 0)];
          commit('setActiveTabKey', tempTab.key);
          localStorage.setItem(ACTIVE_TAB_KEY, tempTab.key);
        }
        commit('setTabList', tabList);
        localStorage.setItem(TAB_LIST_KEY, JSON.stringify(tabList));
        resolve()
      })
    },
    // 清除 tabs
    clearTabs({commit}) {
      commit('setTabList', []);
      commit('setActiveTabKey', '');
      localStorage.setItem(ACTIVE_TAB_KEY, '');
      localStorage.setItem(TAB_LIST_KEY, JSON.stringify([]));
    }
  },
  getters: {
    getTabList(state) {
      return state.tabList;
    },
    getActiveTabKey(state) {
      return state.activeTabKey;
    }
  }
}

export default app