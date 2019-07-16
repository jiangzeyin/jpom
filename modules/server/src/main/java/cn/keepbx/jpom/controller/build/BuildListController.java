package cn.keepbx.jpom.controller.build;

import cn.hutool.core.io.FileUtil;
import cn.hutool.crypto.SecureUtil;
import cn.jiangzeyin.common.validator.ValidatorConfig;
import cn.jiangzeyin.common.validator.ValidatorItem;
import cn.jiangzeyin.common.validator.ValidatorRule;
import cn.keepbx.jpom.common.BaseServerController;
import cn.keepbx.jpom.service.build.BuildService;
import cn.keepbx.jpom.system.ConfigBean;
import cn.keepbx.util.GitUtil;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.annotation.Resource;
import java.io.File;
import java.io.IOException;

/**
 * 构建列表
 *
 * @author bwcx_jzy
 * @date 2019/7/16
 */
@Controller
@RequestMapping(value = "/build")
public class BuildListController extends BaseServerController {

    @Resource
    private BuildService buildService;


    /**
     * 展示监控页面
     */
    @RequestMapping(value = "list.html", method = RequestMethod.GET, produces = MediaType.TEXT_HTML_VALUE)
    public String list() {
        return "build/list";
    }

    /**
     * 修改监控
     */
    @RequestMapping(value = "edit.html", method = RequestMethod.GET, produces = MediaType.TEXT_HTML_VALUE)
    public String edit(String id) {
        return "build/edit";
    }

    @RequestMapping(value = "branchList.json", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_UTF8_VALUE)
    @ResponseBody
    public String branchList(
            @ValidatorConfig(@ValidatorItem(value = ValidatorRule.URL, msg = "仓库地址不正确")) String url,
            @ValidatorConfig(@ValidatorItem(value = ValidatorRule.NOT_BLANK, msg = "登录账号")) String userName,
            @ValidatorConfig(@ValidatorItem(value = ValidatorRule.NOT_BLANK, msg = "登录密码")) String userPwd) {
        //  生成临时路径
        String tempId = SecureUtil.md5(url);
        File file = ConfigBean.getInstance().getTempPath();
        File gitFile = FileUtil.file(file, "gitTemp", tempId);
        try {
            GitUtil.branchList(url, gitFile, new UsernamePasswordCredentialsProvider(userName, userPwd));
        } catch (GitAPIException | IOException e) {
            e.printStackTrace();
        }
        return null;
    }

}