/**
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import breakpointHoc from 'src/plugins/debugger/views/BreakpointHoc';
import HoverGroup from 'plugins/ballerina/graphical-editor/controller-utils/hover-group';
import SimpleBBox from 'plugins/ballerina/model/view/simple-bounding-box';
import Node from '../../../../../model/tree/node';
import DropZone from '../../../../../drag-drop/DropZone';
import './compound-statement-decorator.css';
import ActionBox from '../decorators/action-box';
import ActiveArbiter from '../decorators/active-arbiter';
import Breakpoint from '../decorators/breakpoint';
import { getComponentForNodeArray } from './../../../../diagram-util';
import FragmentUtils from './../../../../../utils/fragment-utils';
import TreeBuilder from './../../../../../model/tree-builder';

/**
 * Wraps other UI elements and provide box with a heading.
 * Enrich elements with a action box and expression editors.
 */
class CatchStatementDecorator extends React.Component {

    /**
     * Initialize the block decorator.
     */
    constructor(props) {
        super(props);
        this.state = {
            active: 'hidden',
        };
        this.onDelete = this.onDelete.bind(this);
        this.onJumpToCodeLine = this.onJumpToCodeLine.bind(this);
        this.setActionVisibilityFalse = this.setActionVisibility.bind(this, false);
        this.setActionVisibilityTrue = this.setActionVisibility.bind(this, true);
        this.setCatchCondition = this.setCatchCondition.bind(this);
        this.getCatchCondition = this.getCatchCondition.bind(this);
        this.editorOptions = {
            propertyType: 'text',
            key: 'Catch condition',
            model: this.props.model,
            getterMethod: this.getCatchCondition,
            setterMethod: this.setCatchCondition,
        };
    }

    /**
     * Handles click event of breakpoint, adds/remove breakpoint from the node when click event fired
     *
     */
    onBreakpointClick() {
        const { model } = this.props;
        const { isBreakpoint = false } = model;
        if (isBreakpoint) {
            model.removeBreakpoint();
        } else {
            model.addBreakpoint();
        }
    }

    /**
     * Removes self on delete button click. Note that model is retried form dropTarget for
     * backward compatibility with old components written when model was not required.
     * @returns {void}
     */
    onDelete() {
        const model = this.props.model;
        model.remove();
    }
    /**
     * Navigates to codeline in the source view from the design view node
     *
     */
    onJumpToCodeLine() {
        const { editor } = this.context;
        editor.goToSource(this.props.model);
    }

    /**
     * Call-back for when a new value is entered via expression editor.
     */
    onUpdate() {
        // TODO: implement validate logic.
    }

    /**
     * Shows the action box, depending on whether on child element, delays display.
     * @param {boolean} show - Display action box.
     * @param {MouseEvent} e - Mouse move event from moving on to or out of statement.
     */
    setActionVisibility(show, e) {
        e.stopPropagation();
        if (show) {
            const isInChildStatement = this.isInFocusableChild(e.target);
            const isFromChildStatement = this.isInFocusableChild(e.relatedTarget);

            if (!isInChildStatement) {
                if (isFromChildStatement) {
                    this.context.activeArbiter.readyToDelayedActivate(this);
                } else {
                    this.context.activeArbiter.readyToActivate(this);
                }
            }
        } else {
            let elm = e.relatedTarget;
            let isInMe = false;
            while (elm && elm.getAttribute) {
                if (elm === this.myRoot) {
                    isInMe = true;
                }
                elm = elm.parentNode;
            }
            if (!isInMe) {
                this.context.activeArbiter.readyToDeactivate(this);
            }
        }
    }

    /**
     * Set catch condition.
     *  @param {String} newCondition - new condition to be applied to catch block.
     * */
    setCatchCondition(newCondition) {
        if (!newCondition) {
            return;
        }
        newCondition = _.trimEnd(newCondition, ';');
        const fragmentJson = FragmentUtils.createArgumentParameterFragment(newCondition);
        const parsedJson = FragmentUtils.parseFragment(fragmentJson);
        if (!parsedJson.error) {
            const newNode = TreeBuilder.build(parsedJson, this.props.model.parent, this.props.model.parent.kind);
            newNode.clearWS();
            this.props.model.setParameter(newNode);
        }
    }

    /**
     * Get catch condition
     * @return {string} parameter source.
     * */
    getCatchCondition() {
        return this.props.model.getParameter().getSource();
    }

    /**
     * True if the given element is a child of this element that has it's own focus.
     * @private
     * @param {HTMLElement} elmToCheck - child to be checked.
     * @return {boolean} True if child is focusable.
     */
    isInFocusableChild(elmToCheck) {
        const regex = new RegExp('(^|\\s)((compound-)?statement|life-line-group)(\\s|$)');
        let isInStatement = false;
        let elm = elmToCheck;
        while (elm && elm !== this.myRoot && elm.getAttribute) {
            if (regex.test(elm.getAttribute('class'))) {
                isInStatement = true;
            }
            elm = elm.parentNode;
        }
        return isInStatement;
    }

    /**
     * Render breakpoint element.
     * @private
     * @return {XML} React element of the breakpoint.
     */
    renderBreakpointIndicator() {
        const breakpointSize = 14;
        const { bBox } = this.props;
        const breakpointHalf = breakpointSize / 2;
        const pointX = bBox.getRight() - breakpointHalf;
        const { model: { viewState } } = this.props;
        const statementBBox = viewState.components['statement-box'];
        const pointY = statementBBox.y - breakpointHalf;
        return (
            <Breakpoint
                x={pointX}
                y={pointY}
                size={breakpointSize}
                isBreakpoint={this.props.isBreakpoint}
                onClick={() => this.props.onBreakpointClick()}
            />
        );
    }

    /**
     * Override the rendering logic.
     * @returns {XML} rendered component.
     */
    render() {
        const { bBox, expression, isBreakpoint, isDebugHit, connectorStartX } = this.props;
        const { designer } = this.context;

        const model = this.props.model;
        const viewState = model.viewState;
        const titleH = this.context.designer.config.compoundStatement.heading.height;
        const titleW = this.context.designer.config.compoundStatement.heading.width;
        const statementBBox = viewState.components['statement-box'];
        const gapLeft = this.context.designer.config.compoundStatement.padding.left;
        const gapTop = this.context.designer.config.compoundStatement.padding.top;
        const displayExpression = viewState.components.expression;

        // Defining coordinates of the diagram
        // (x,y)
        // (P1)       (P2)|---------|(P3)
        //       ---------|  catch  |
        //                |____ ____|
        //                     |(p8)
        //                   __|__
        //                   a = 1;
        //                     |
        //                     |
        //                     |
        //                    (P6)

        const p1X = bBox.x - gapLeft;
        const p1Y = bBox.y + gapTop;

        const p2X = bBox.x - (titleW / 2);
        const p2Y = p1Y + (titleH / 2);

        const p6X = bBox.x;
        const p6Y = bBox.y + bBox.h;

        const p8X = bBox.x;
        const p8Y = p2Y + (titleH / 2);

        const p11X = p1X;
        const p11Y = p1Y + (titleH / 2);

        this.conditionBox = new SimpleBBox(p2X, (p2Y - (this.context.designer.config.statement.height / 2)),
            statementBBox.w, this.context.designer.config.statement.height);

        const actionBoxBbox = new SimpleBBox();
        actionBoxBbox.w = (3 * designer.config.actionBox.width) / 4;
        actionBoxBbox.h = designer.config.actionBox.height;
        actionBoxBbox.x = p8X - (actionBoxBbox.w / 2);
        actionBoxBbox.y = p8Y;

        let statementRectClass = 'statement-title-rect';
        if (isDebugHit) {
            statementRectClass = `${statementRectClass} debug-hit`;
        }

        const body = getComponentForNodeArray(this.props.model.body);

        return (
            <g
                onMouseOut={this.setActionVisibilityFalse}
                onMouseOver={this.setActionVisibilityTrue}
                ref={(group) => {
                    this.myRoot = group;
                }}
            >
                <line
                    x1={connectorStartX}
                    y1={p2Y}
                    x2={p2X}
                    y2={p2Y}
                    className='flowchart-background-empty-rect'
                />
                <rect
                    x={p2X}
                    y={p1Y}
                    width={titleW}
                    height={titleH}
                    className={statementRectClass}
                    rx='5'
                    ry='5'
                />
                {expression &&
                    <text
                        x={p8X}
                        y={(p2Y + p8Y) / 2}
                        className='condition-text'
                    >
                        {displayExpression.text}
                    </text>
                }
                <text
                    x={p2X + designer.config.compoundStatement.text.padding}
                    y={(p1Y + p2Y) / 2}
                    className='statement-title-text-left'
                >catch
                </text>
                <DropZone
                    x={p11X}
                    y={p11Y}
                    width={statementBBox.w}
                    height={statementBBox.h}
                    baseComponent='rect'
                    dropTarget={this.props.model.body}
                    enableDragBg
                    enableCenterOverlayLine={!this.props.disableDropzoneMiddleLineOverlay}
                />
                <line
                    x1={p8X}
                    y1={p8Y}
                    x2={p6X}
                    y2={p6Y}
                    className='flowchart-background-empty-rect'
                />
                <g>
                    <rect
                        x={p2X}
                        y={p2Y}
                        width={titleW}
                        height={titleH / 2}
                        className='invisible-rect'
                    />
                    {expression && <title> {expression.text} </title>}
                </g>
                { isBreakpoint && this.renderBreakpointIndicator() }
                {this.props.children}
                {body}
                <HoverGroup model={this.props.model} region='actionBox'>
                    <rect
                        x={p8X}
                        y={p8Y}
                        width={50}
                        height={25}
                        className='invisible-rect'
                    />
                </HoverGroup>
                <HoverGroup model={this.props.model} region='main'>
                    <rect
                        x={p8X}
                        y={p8Y + 25}
                        width={50}
                        height={50}
                        className='invisible-rect'
                    />
                </HoverGroup>
            </g>);
    }
}

CatchStatementDecorator.defaultProps = {
    draggable: null,
    children: null,
    undeletable: false,
    editorOptions: null,
    parameterEditorOptions: null,
    utilities: null,
    parameterBbox: null,
    disableButtons: {
        debug: false,
        delete: false,
        jump: false,
    },
    disableDropzoneMiddleLineOverlay: false,
    isDebugHit: false,
};

CatchStatementDecorator.propTypes = {
    model: PropTypes.instanceOf(Node).isRequired,
    children: PropTypes.arrayOf(PropTypes.node),
    bBox: PropTypes.instanceOf(SimpleBBox).isRequired,
    expression: PropTypes.shape({
        text: PropTypes.string,
    }).isRequired,
    onBreakpointClick: PropTypes.func.isRequired,
    isBreakpoint: PropTypes.bool.isRequired,
    disableButtons: PropTypes.shape({
        debug: PropTypes.bool,
        delete: PropTypes.bool,
        jump: PropTypes.bool,
    }),
    connectorStartX: PropTypes.number.isRequired,
    disableDropzoneMiddleLineOverlay: PropTypes.bool,
    isDebugHit: PropTypes.bool,
};

CatchStatementDecorator.contextTypes = {
    getOverlayContainer: PropTypes.instanceOf(Object).isRequired,
    environment: PropTypes.instanceOf(Object).isRequired,
    editor: PropTypes.instanceOf(Object).isRequired,
    mode: PropTypes.string,
    activeArbiter: PropTypes.instanceOf(ActiveArbiter).isRequired,
    designer: PropTypes.instanceOf(Object),
};

export default breakpointHoc(CatchStatementDecorator);
