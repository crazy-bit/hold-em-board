/**
 * 分数录入页身份识别与权限测试
 */

describe('分数录入页权限', () => {
  function createPage({ globalOpenId, loginOpenId = 'member', scoreUserId = 'member', adminId = 'admin' }) {
    jest.resetModules();

    const app = { globalData: { openId: globalOpenId, userInfo: null } };
    const callFunction = jest.fn(({ name }) => {
      if (name === 'login') {
        return Promise.resolve({
          result: { code: 0, openId: loginOpenId, nickName: '测试用户', avatarUrl: '' },
        });
      }
      return Promise.resolve({ result: { code: 0 } });
    });
    const db = {
      collection: jest.fn((name) => ({
        doc: jest.fn((id) => ({
          get: jest.fn().mockResolvedValue({
            data: name === 'scores'
              ? {
                _id: id,
                userId: scoreUserId,
                groupId: 'trusted-group',
                matchId: 'match1',
                nickName: '目标成员',
                initialChips: 1000,
                bonus: 100,
                finalChips: null,
              }
              : { _id: id, adminId, bonusCountsToTotal: true },
          }),
        })),
      })),
    };

    global.getApp = jest.fn(() => app);
    global.wx = {
      cloud: { callFunction, database: jest.fn(() => db) },
      showToast: jest.fn(),
    };

    let pageConfig;
    global.Page = jest.fn((config) => { pageConfig = config; });
    jest.doMock('tdesign-miniprogram/toast/index', () => null, { virtual: true });
    require('../../subpages/score/input/input');

    const page = {
      ...pageConfig,
      data: { ...pageConfig.data, scoreId: 'score1', groupId: 'forged-group' },
      setData(update) {
        Object.assign(this.data, update);
      },
    };

    return { page, app, callFunction, db };
  }

  afterEach(() => {
    delete global.getApp;
    delete global.Page;
    delete global.wx;
  });

  it('冷启动时恢复 openId，并正确识别本人填写', async () => {
    const { page, app, callFunction, db } = createPage({ globalOpenId: null, loginOpenId: 'member' });

    await page.loadScore();

    expect(callFunction).toHaveBeenCalledWith({ name: 'login', data: {} });
    expect(app.globalData.openId).toBe('member');
    expect(page.data).toEqual(expect.objectContaining({
      groupId: 'trusted-group',
      identityReady: true,
      isSelf: true,
      isAdmin: false,
      canEdit: true,
      isFillingForOther: false,
    }));
    expect(db.collection).toHaveBeenCalledWith('groups');
  });

  it('管理员填写他人分数时显示目标成员', async () => {
    const { page } = createPage({ globalOpenId: 'admin', scoreUserId: 'member', adminId: 'admin' });

    await page.loadScore();

    expect(page.data).toEqual(expect.objectContaining({
      isSelf: false,
      isAdmin: true,
      canEdit: true,
      isFillingForOther: true,
      targetNickName: '目标成员',
    }));
  });

  it('普通成员访问他人分数时不冒充管理员且不能保存', async () => {
    const { page, callFunction } = createPage({ globalOpenId: 'outsider', scoreUserId: 'member', adminId: 'admin' });

    await page.loadScore();
    page.setData({ finalChips: '800' });
    await page.saveScore();

    expect(page.data).toEqual(expect.objectContaining({
      isSelf: false,
      isAdmin: false,
      canEdit: false,
      isFillingForOther: false,
    }));
    expect(callFunction).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'saveScore' }));
    expect(global.wx.showToast).toHaveBeenCalledWith(expect.objectContaining({
      title: '只有本人或管理员可以修改分数',
    }));
  });
});
